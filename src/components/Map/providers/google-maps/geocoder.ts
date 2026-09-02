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

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/** Statuses that mean the request was understood, whether or not it matched anything. */
const ACCEPTED_STATUSES = ['OK', 'ZERO_RESULTS'];

/**
 * Component types each address component is read from, most specific first.
 * Carried over from the legacy MapPicker, which resolved Google's components the same way.
 */
const COMPONENT_TYPES: { [component: string]: string[] } = {
    country: ['country'],
    administrativeArea: [
        'administrative_area_level_5',
        'administrative_area_level_4',
        'administrative_area_level_3',
        'administrative_area_level_2',
        'administrative_area_level_1'
    ],
    locality: ['locality', 'administrative_area_level_3', 'administrative_area_level_2'],
    subLocality: ['sublocality_level_2', 'sublocality_level_1', 'sublocality'],
    street: ['street_address', 'route', 'premise'],
    streetNumber: ['street_number'],
    postalCode: ['postal_code']
};

export interface IGoogleAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

export interface IGoogleGeocodeResult {
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
    address_components?: IGoogleAddressComponent[];
}

export interface IGoogleGeocodeResponse {
    status: string;
    error_message?: string;
    results?: IGoogleGeocodeResult[];
}

/**
 * Finds the first component of a result carrying any of a list of types.
 *
 * @param components Components of one geocoding result.
 * @param types Types to look for, most specific first.
 * @returns The matching component, or `undefined`.
 */
const findComponent = (components: IGoogleAddressComponent[], types: string[]): IGoogleAddressComponent | undefined => {
    for (const type of types) {
        const component = components.find((candidate) => candidate.types.includes(type));
        if (component) {
            return component;
        }
    }
    return undefined;
};

/**
 * Maps one Google geocoding result onto a place.
 *
 * @param result Result as the Geocoding API returns it.
 * @returns The place, or `undefined` when the result carries no position.
 */
export const getGooglePlace = (result: IGoogleGeocodeResult): IMapPlace | undefined => {
    const location = result.geometry?.location;
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return undefined;
    }
    const components = result.address_components ?? [];
    const address: IAddress = {
        latitude: location.lat,
        longitude: location.lng,
        text: result.formatted_address,
        countryCode: findComponent(components, COMPONENT_TYPES.country)?.short_name
    };
    Object.entries(COMPONENT_TYPES).forEach(([component, types]) => {
        const value = findComponent(components, types)?.long_name;
        if (value) {
            (address as { [key: string]: any })[component] = value;
        }
    });
    return {
        coordinates: { latitude: location.lat, longitude: location.lng },
        address,
        label: result.formatted_address || getAddressLabel(address)
    };
};

/**
 * Reads the places out of a Geocoding API response.
 *
 * @param response Response body.
 * @returns The places it matched.
 * @throws When Google rejected the request, so a disabled api or a bad key is not read as "no results".
 */
export const getGooglePlaces = (response: IGoogleGeocodeResponse): IMapPlace[] => {
    if (!ACCEPTED_STATUSES.includes(response.status)) {
        throw new Error(`Google geocoding failed with ${response.status}${response.error_message ? `: ${response.error_message}` : ''}`);
    }
    return (response.results ?? [])
        .map(getGooglePlace)
        .filter((place): place is IMapPlace => !!place);
};

/**
 * Builds the Google Maps geocoder, backed by the Geocoding API.
 *
 * @param apiKey Key of a project with the Geocoding API enabled.
 * @returns A geocoder that answers the same lookup only once.
 */
export const createGoogleMapsGeocoder: IMapGeocoderFactory = (apiKey: string): IMapGeocoder => withGeocodingCache({
    geocode: async (query, options) => {
        if (!query.trim()) {
            return [];
        }
        const response = await getJson<IGoogleGeocodeResponse>(
            buildUrl(GEOCODE_URL, { address: query, language: options?.language, key: apiKey }),
            { signal: options?.signal }
        );
        return getGooglePlaces(response).slice(0, options?.limit ?? DEFAULT_GEOCODING_LIMIT);
    },
    reverseGeocode: async (coordinates: IMapCoordinates, options) => {
        const response = await getJson<IGoogleGeocodeResponse>(
            buildUrl(GEOCODE_URL, {
                latlng: `${coordinates.latitude},${coordinates.longitude}`,
                language: options?.language,
                key: apiKey
            }),
            { signal: options?.signal }
        );
        return getGooglePlaces(response)[0] ?? null;
    }
});
