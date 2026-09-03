import { IAddress } from '@talxis/client-libraries';
import { createResultCache } from './http';
import { IMapCoordinates } from './viewport';

/** Candidates a geocoder returns when the caller does not ask for a different number. */
export const DEFAULT_GEOCODING_LIMIT = 5;

/** A place a geocoding service resolved: where it is, and the address components behind it. */
export interface IMapPlace {
    coordinates: IMapCoordinates;
    /** Address components, in the shape `@talxis/client-libraries` already uses for an address. */
    address: IAddress;
    /** One line description, for a suggestion list. */
    label: string;
}

export interface IMapGeocodingOptions {
    /** BCP 47 tag the service should answer in. */
    language?: string;
    /** Most candidates to return. A service may return fewer, never more. */
    limit?: number;
    signal?: AbortSignal;
}

/**
 * Turns addresses into coordinates and back.
 *
 * Every vendor that has a geocoding service implements this, so the control never learns which one is
 * answering - and a vendor without one simply does not build a geocoder.
 */
export interface IMapGeocoder {
    /** Places matching an address, best first. An address the service does not know resolves to none. */
    geocode(query: string, options?: IMapGeocodingOptions): Promise<IMapPlace[]>;
    /** The place covering a point, or `null` when the service knows of none. */
    reverseGeocode(coordinates: IMapCoordinates, options?: IMapGeocodingOptions): Promise<IMapPlace | null>;
}

/** Builds a vendor's geocoder from the api key the control resolved for it. */
export type IMapGeocoderFactory = (apiKey: string) => IMapGeocoder;

/** Composes a one line description out of address components, for a service that returns none of its own. */
export const getAddressLabel = (address: IAddress): string => {
    const street = [address.street, address.streetNumber].filter(Boolean).join(' ');
    const locality = [address.postalCode, address.locality].filter(Boolean).join(' ');
    return [street, locality, address.country].filter(Boolean).join(', ');
};

/**
 * Rounds coordinates to the precision a cache key needs, so two reads of the same pin share an entry -
 * precise to roughly a tenth of a metre.
 */
const getCoordinatesKey = (coordinates: IMapCoordinates): string =>
    `${coordinates.latitude.toFixed(6)},${coordinates.longitude.toFixed(6)}`;

/**
 * Wraps a geocoder so the same lookup is only ever made once. In flight calls are shared rather than
 * duplicated, which matters when a page of records all carry the same address - and a failed call is
 * forgotten, so a transient error does not become a permanent one.
 */
export const withGeocodingCache = (geocoder: IMapGeocoder, maxEntries = 500): IMapGeocoder => {
    const forward = createResultCache<Promise<IMapPlace[]>>(maxEntries);
    const reverse = createResultCache<Promise<IMapPlace | null>>(maxEntries);

    return {
        geocode: (query, options) => {
            const key = `${options?.language ?? ''}|${options?.limit ?? ''}|${query}`;
            const cached = forward.get(key);
            if (cached) {
                return cached;
            }
            const result = geocoder.geocode(query, options);
            forward.set(key, result);
            result.catch(() => forward.delete(key));
            return result;
        },
        reverseGeocode: (coordinates, options) => {
            const key = `${options?.language ?? ''}|${getCoordinatesKey(coordinates)}`;
            const cached = reverse.get(key);
            if (cached) {
                return cached;
            }
            const result = geocoder.reverseGeocode(coordinates, options);
            reverse.set(key, result);
            result.catch(() => reverse.delete(key));
            return result;
        }
    };
};
