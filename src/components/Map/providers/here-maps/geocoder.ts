import { IAddress } from '@talxis/client-libraries';
import {
    DEFAULT_GEOCODING_LIMIT,
    getAddressLabel,
    IMapGeocoder,
    IMapGeocoderFactory,
    IMapPlace,
    withGeocodingCache
} from '../../geocoding';
import { buildUrl, getJson } from '../../http';
import { IMapCoordinates } from '../../viewport';

const GEOCODE_URL = 'https://geocode.search.hereapi.com/v1/geocode';
const REVERSE_GEOCODE_URL = 'https://revgeocode.search.hereapi.com/v1/revgeocode';

export interface IHereAddress {
    label?: string;
    countryCode?: string;
    countryName?: string;
    state?: string;
    county?: string;
    city?: string;
    district?: string;
    subdistrict?: string;
    street?: string;
    houseNumber?: string;
    postalCode?: string;
}

export interface IHereGeocodeItem {
    title?: string;
    address?: IHereAddress;
    position?: { lat: number; lng: number };
}

export interface IHereGeocodeResponse {
    items?: IHereGeocodeItem[];
}

/**
 * Maps one HERE geocoding item onto a place.
 *
 * HERE reports a three letter country code, which is kept as it comes rather than guessed down to two.
 *
 * @param item Item as the Geocoding and Search API returns it.
 * @returns The place, or `undefined` when the item carries no position.
 */
export const getHerePlace = (item: IHereGeocodeItem): IMapPlace | undefined => {
    const position = item.position;
    if (!position || typeof position.lat !== 'number' || typeof position.lng !== 'number') {
        return undefined;
    }
    const source = item.address ?? {};
    const address: IAddress = {
        latitude: position.lat,
        longitude: position.lng,
        text: source.label ?? item.title,
        country: source.countryName,
        countryCode: source.countryCode,
        administrativeArea: source.state,
        region: source.county,
        locality: source.city,
        subLocality: source.district ?? source.subdistrict,
        street: source.street,
        streetNumber: source.houseNumber,
        postalCode: source.postalCode
    };
    return {
        coordinates: { latitude: position.lat, longitude: position.lng },
        address,
        label: source.label || item.title || getAddressLabel(address)
    };
};

/**
 * Reads the places out of a HERE geocoding response.
 *
 * @param response Response body.
 * @returns The places it matched.
 */
export const getHerePlaces = (response: IHereGeocodeResponse): IMapPlace[] =>
    (response.items ?? []).map(getHerePlace).filter((place): place is IMapPlace => !!place);

/**
 * Builds the HERE geocoder, backed by the Geocoding and Search API v7.
 *
 * @param apiKey Key of a HERE platform project.
 * @returns A geocoder that answers the same lookup only once.
 */
export const createHereMapsGeocoder: IMapGeocoderFactory = (apiKey: string): IMapGeocoder => withGeocodingCache({
    geocode: async (query, options) => {
        if (!query.trim()) {
            return [];
        }
        const response = await getJson<IHereGeocodeResponse>(
            buildUrl(GEOCODE_URL, {
                q: query,
                lang: options?.language,
                limit: options?.limit ?? DEFAULT_GEOCODING_LIMIT,
                apiKey
            }),
            { signal: options?.signal }
        );
        return getHerePlaces(response);
    },
    reverseGeocode: async (coordinates: IMapCoordinates, options) => {
        const response = await getJson<IHereGeocodeResponse>(
            buildUrl(REVERSE_GEOCODE_URL, {
                at: `${coordinates.latitude},${coordinates.longitude}`,
                lang: options?.language,
                limit: 1,
                apiKey
            }),
            { signal: options?.signal }
        );
        return getHerePlaces(response)[0] ?? null;
    }
});
