import { useEffect, useRef, useState } from 'react';
import { IRecord } from '@talxis/client-libraries';
import { getRecordValue } from '../internal/attributes';
import { IMapGeocoder } from '../internal/geocoding';
import { runWithConcurrency } from '../internal/http';
import { IMapFallbackCoordinates } from '../internal/pins';
import { IMapCoordinates } from '../internal/viewport';

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
    /** How many are still waiting. */
    pendingCount: number;
}

interface IGeocodingAttempt {
    query: string;
    /** `null` marks an address the service could not place, so it is never asked about again. */
    coordinates: IMapCoordinates | null;
}

const EMPTY_STATE: IGeocodedLocationsState = {
    coordinates: {},
    isResolving: false,
    pendingCount: 0
};

/**
 * Places the records that carry an address but no coordinates. A record the service cannot place is
 * remembered as unplaceable rather than retried - resolving a record removes it from the input, and failing
 * to resolve one would otherwise put it straight back.
 */
export const useGeocodedLocations = (props: IUseGeocodedLocations): IGeocodedLocationsState => {
    const { records, addressAttribute, geocoder, language, maxRequests } = props;
    const [state, setState] = useState<IGeocodedLocationsState>(EMPTY_STATE);
    const attemptedRef = useRef(new Map<string, IGeocodingAttempt>());
    const runIdRef = useRef(0);

    const isEnabled = !!addressAttribute && !!geocoder;
    const getQuery = (record: IRecord) => {
        const address = getRecordValue(record, addressAttribute as string);
        return address === null || address === undefined ? '' : `${address}`;
    };
    //the records array is rebuilt on every load, so the effect keys off their content; the address is part of
    //it because an edited address is a new question about the same record
    const recordKey = isEnabled ? records.map((record) => `${record.getRecordId()}:${getQuery(record)}`).join('|') : '';

    useEffect(() => {
        const runId = ++runIdRef.current;
        if (!isEnabled) {
            attemptedRef.current = new Map();
            setState(EMPTY_STATE);
            return;
        }
        const pending = records.filter((record) => attemptedRef.current.get(record.getRecordId())?.query !== getQuery(record));
        if (!pending.length) {
            //a superseded run never cleared its flags, so a run with nothing to do still resets them
            setState((current) => (current.isResolving || current.pendingCount
                ? { ...current, isResolving: false, pendingCount: 0 }
                : current));
            return;
        }
        const limited = pending.slice(0, maxRequests ?? DEFAULT_MAX_GEOCODING_REQUESTS);
        const controller = new AbortController();

        const publish = (): IMapFallbackCoordinates => {
            const coordinates: IMapFallbackCoordinates = {};
            attemptedRef.current.forEach((attempt, recordId) => {
                if (attempt.coordinates) {
                    coordinates[recordId] = attempt.coordinates;
                }
            });
            return coordinates;
        };

        setState((current) => ({ ...current, isResolving: true, pendingCount: limited.length }));

        void runWithConcurrency(limited, async (record) => {
            const query = getQuery(record);
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
                attemptedRef.current.set(record.getRecordId(), { query: getQuery(record), coordinates: result ?? null });
                if (runIdRef.current !== runId) {
                    return;
                }
                setState((current) => ({ ...current, coordinates: publish() }));
            }
        }).then((results) => {
            //an item the run never reached still counts as attempted, or the effect would restart on it
            results.forEach(({ item, result }) => {
                if (!attemptedRef.current.has(item.getRecordId())) {
                    attemptedRef.current.set(item.getRecordId(), { query: getQuery(item), coordinates: result ?? null });
                }
            });
            if (runIdRef.current !== runId) {
                return;
            }
            setState({ coordinates: publish(), isResolving: false, pendingCount: 0 });
        });

        return () => {
            controller.abort();
        };
        //recordKey stands in for records, which is rebuilt on every load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recordKey, isEnabled, addressAttribute, geocoder, language, maxRequests]);

    return state;
};
