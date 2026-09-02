import { useEffect, useRef, useState } from 'react';
import { IRecord } from '@talxis/client-libraries';
import { getRecordValue } from './attributes';
import { IMapGeocoder } from './geocoding';
import { runWithConcurrency } from './http';
import { IMapFallbackCoordinates } from './pins';
import { IMapCoordinates } from './viewport';

/** Addresses resolved at once. Enough to fill a map quickly, few enough to stay inside a service's limits. */
const DEFAULT_CONCURRENCY = 4;

/** Addresses resolved per set of records, so one unscoped view cannot spend a whole geo-coding quota. */
export const DEFAULT_MAX_GEOCODING_REQUESTS = 250;

export interface IUseGeocodedLocations {
    /** Records no coordinates could be read from. */
    records: IRecord[];
    /** Attribute holding the full address. Nothing here turns the fallback off entirely. */
    addressAttribute?: string;
    /** Geocoder to resolve with, from whichever configured vendor has one. */
    geocoder?: IMapGeocoder;
    /** Language the addresses should be resolved in. */
    language?: string;
    /** Addresses to resolve before stopping. */
    maxRequests?: number;
}

export interface IGeocodedLocationsState {
    /** Coordinates resolved so far, keyed by record id, ready to hand to `getMapPins`. */
    coordinates: IMapFallbackCoordinates;
    /** Whether addresses are still being resolved. */
    isResolving: boolean;
    /** How many have been placed so far. */
    resolvedCount: number;
    /** How many are still waiting. */
    pendingCount: number;
}

const EMPTY_STATE: IGeocodedLocationsState = {
    coordinates: {},
    isResolving: false,
    resolvedCount: 0,
    pendingCount: 0
};

/**
 * Places the records that carry an address but no coordinates.
 *
 * A record the service cannot place is remembered as unplaceable rather than retried, which is what stops
 * the loop: resolving a record removes it from the input, and failing to resolve one would otherwise put it
 * straight back.
 *
 * @param props Unplaced records, the address attribute, the geocoder and the limits.
 * @returns Coordinates resolved so far, and how the resolving is going.
 */
export const useGeocodedLocations = (props: IUseGeocodedLocations): IGeocodedLocationsState => {
    const { records, addressAttribute, geocoder, language, maxRequests } = props;
    const [state, setState] = useState<IGeocodedLocationsState>(EMPTY_STATE);
    //null marks an address the service could not place, so it is never asked about again
    const attemptedRef = useRef(new Map<string, IMapCoordinates | null>());
    const runIdRef = useRef(0);

    const isEnabled = !!addressAttribute && !!geocoder;
    //the records array is rebuilt on every load, so the effect keys off which records it holds
    const recordKey = isEnabled ? records.map((record) => record.getRecordId()).join('|') : '';

    useEffect(() => {
        const runId = ++runIdRef.current;
        if (!isEnabled) {
            attemptedRef.current = new Map();
            setState(EMPTY_STATE);
            return;
        }
        const pending = records.filter((record) => !attemptedRef.current.has(record.getRecordId()));
        if (!pending.length) {
            return;
        }
        const limited = pending.slice(0, maxRequests ?? DEFAULT_MAX_GEOCODING_REQUESTS);
        const controller = new AbortController();

        const publish = () => {
            const coordinates: IMapFallbackCoordinates = {};
            let resolvedCount = 0;
            attemptedRef.current.forEach((value, recordId) => {
                if (value) {
                    coordinates[recordId] = value;
                    resolvedCount += 1;
                }
            });
            return { coordinates, resolvedCount };
        };

        setState((current) => ({ ...current, isResolving: true, pendingCount: limited.length }));

        void runWithConcurrency(limited, async (record) => {
            const address = getRecordValue(record, addressAttribute as string);
            const query = address === null || address === undefined ? '' : `${address}`;
            if (!query.trim()) {
                return null;
            }
            const places = await (geocoder as IMapGeocoder).geocode(query, {
                language,
                limit: 1,
                signal: controller.signal
            });
            return places[0]?.coordinates ?? null;
        }, {
            limit: DEFAULT_CONCURRENCY,
            isCancelled: () => runIdRef.current !== runId,
            onResult: (record, result) => {
                attemptedRef.current.set(record.getRecordId(), result ?? null);
                if (runIdRef.current !== runId) {
                    return;
                }
                const { coordinates, resolvedCount } = publish();
                setState((current) => ({ ...current, coordinates, resolvedCount }));
            }
        }).then((results) => {
            //an item the run never reached still counts as attempted, or the effect would restart on it
            results.forEach(({ item, result }) => {
                if (!attemptedRef.current.has(item.getRecordId())) {
                    attemptedRef.current.set(item.getRecordId(), result ?? null);
                }
            });
            if (runIdRef.current !== runId) {
                return;
            }
            const { coordinates, resolvedCount } = publish();
            setState({ coordinates, resolvedCount, isResolving: false, pendingCount: 0 });
        });

        return () => {
            controller.abort();
        };
        //recordKey stands in for records, which is rebuilt on every load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recordKey, isEnabled, addressAttribute, geocoder, language, maxRequests]);

    return state;
};
