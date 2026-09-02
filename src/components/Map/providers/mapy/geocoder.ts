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

const GEOCODE_URL = 'https://api.mapy.com/v1/geocode';
const REVERSE_GEOCODE_URL = 'https://api.mapy.com/v1/rgeocode';

export interface IMapyRegionalPart {
    name?: string;
    type?: string;
    isoCode?: string;
}

export interface IMapyGeocodeItem {
    name?: string;
    label?: string;
    location?: string;
    zip?: string;
    position?: { lat: number; lon: number };
    regionalStructure?: IMapyRegionalPart[];
}

export interface IMapyGeocodeResponse {
    items?: IMapyGeocodeItem[];
}

/**
 * Picks a part out of the regional structure by its type.
 *
 * Mapy.com orders the structure from the most specific part outwards and repeats a type where a country has
 * more than one level of it - two `regional.region` entries are a district followed by the region above it.
 *
 * @param parts Regional structure of one item.
 * @param type Type to look for.
 * @param position `first` for the most specific part of that type, `last` for the broadest.
 * @returns The matching part, or `undefined`.
 */
const findRegionalPart = (
    parts: IMapyRegionalPart[],
    type: string,
    position: 'first' | 'last' = 'first'
): IMapyRegionalPart | undefined => {
    const matches = parts.filter((part) => part.type === type);
    return position === 'first' ? matches[0] : matches[matches.length - 1];
};

/**
 * Maps one Mapy.com geocoding item onto a place.
 *
 * @param item Item as the REST API returns it.
 * @returns The place, or `undefined` when the item carries no position.
 */
export const getMapyPlace = (item: IMapyGeocodeItem): IMapPlace | undefined => {
    const position = item.position;
    if (!position || typeof position.lat !== 'number' || typeof position.lon !== 'number') {
        return undefined;
    }
    const parts = item.regionalStructure ?? [];
    const country = findRegionalPart(parts, 'regional.country');
    const text = [item.name, item.location].filter(Boolean).join(', ');
    const address: IAddress = {
        latitude: position.lat,
        longitude: position.lon,
        text: text || undefined,
        country: country?.name,
        countryCode: country?.isoCode,
        //the outermost region is the administrative one, the innermost is the district below it
        administrativeArea: findRegionalPart(parts, 'regional.region', 'last')?.name,
        region: findRegionalPart(parts, 'regional.region')?.name,
        locality: findRegionalPart(parts, 'regional.municipality')?.name,
        subLocality: findRegionalPart(parts, 'regional.municipality_part')?.name,
        street: findRegionalPart(parts, 'regional.street')?.name,
        streetNumber: findRegionalPart(parts, 'regional.address')?.name,
        postalCode: item.zip
    };
    return {
        coordinates: { latitude: position.lat, longitude: position.lon },
        address,
        label: text || getAddressLabel(address)
    };
};

/**
 * Reads the places out of a Mapy.com geocoding response.
 *
 * @param response Response body.
 * @returns The places it matched.
 */
export const getMapyPlaces = (response: IMapyGeocodeResponse): IMapPlace[] =>
    (response.items ?? []).map(getMapyPlace).filter((place): place is IMapPlace => !!place);

/**
 * Builds the Mapy.com geocoder, backed by their REST API.
 *
 * @param apiKey Key from the Mapy.com developer portal.
 * @returns A geocoder that answers the same lookup only once.
 */
export const createMapyGeocoder: IMapGeocoderFactory = (apiKey: string): IMapGeocoder => withGeocodingCache({
    geocode: async (query, options) => {
        if (!query.trim()) {
            return [];
        }
        const response = await getJson<IMapyGeocodeResponse>(
            buildUrl(GEOCODE_URL, {
                query,
                lang: options?.language,
                limit: options?.limit ?? DEFAULT_GEOCODING_LIMIT,
                apikey: apiKey
            }),
            { signal: options?.signal }
        );
        return getMapyPlaces(response);
    },
    reverseGeocode: async (coordinates: IMapCoordinates, options) => {
        const response = await getJson<IMapyGeocodeResponse>(
            buildUrl(REVERSE_GEOCODE_URL, {
                lat: coordinates.latitude,
                lon: coordinates.longitude,
                lang: options?.language,
                apikey: apiKey
            }),
            { signal: options?.signal }
        );
        return getMapyPlaces(response)[0] ?? null;
    }
});
