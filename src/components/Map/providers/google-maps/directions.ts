import { IMapDirections, IMapDirectionsFactory, IMapRoutePath } from '../../directions';
import { getJson } from '../../http';
import { decodeEncodedPolyline } from '../../polyline';
import { IMapCoordinates } from '../../viewport';

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/** Stops one call may carry: the two ends plus the intermediates the Routes API accepts. */
const MAX_STOPS = 25;

/** Fields the response should carry. The Routes API rejects a call that does not ask for any. */
const FIELD_MASK = 'routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration';

export interface IGoogleRoutesResponse {
    routes?: {
        polyline?: { encodedPolyline?: string };
        distanceMeters?: number;
        duration?: string;
    }[];
}

export interface IGoogleDirectionsConfig {
    /** How the route is travelled. Anything the Routes API's `travelMode` accepts. */
    travelMode?: 'DRIVE' | 'BICYCLE' | 'WALK' | 'TWO_WHEELER' | 'TRANSIT';
}

/**
 * Turns a Routes API duration into seconds.
 *
 * @param duration Duration as the API formats it, a number of seconds followed by `s`.
 * @returns The seconds, or `undefined` when there is nothing to read.
 */
const getDurationSeconds = (duration?: string): number | undefined => {
    const seconds = parseFloat(duration ?? '');
    return Number.isFinite(seconds) ? seconds : undefined;
};

/**
 * Reads a path out of a Routes API response.
 *
 * @param response Response body.
 * @returns The path, or `null` when Google routed nothing.
 */
export const getGoogleRoutePath = (response: IGoogleRoutesResponse): IMapRoutePath | null => {
    const route = response.routes?.[0];
    const coordinates = decodeEncodedPolyline(route?.polyline?.encodedPolyline ?? '');
    if (!coordinates.length) {
        return null;
    }
    return {
        coordinates,
        distance: route?.distanceMeters,
        duration: getDurationSeconds(route?.duration)
    };
};

/** Shapes one stop the way the Routes API expects a waypoint. */
const toWaypoint = (stop: IMapCoordinates) => ({
    location: { latLng: { latitude: stop.latitude, longitude: stop.longitude } }
});

/**
 * Builds the Google Maps directions service, backed by the Routes API.
 *
 * The Routes API is a separate api from the one that draws the map and from the Geocoding API, so a project
 * that has not enabled `routes.googleapis.com` answers 403 - which the control reports and then falls back
 * to a straight line for.
 *
 * @param apiKey Key of a project with the Routes API enabled.
 * @param config Travel mode. Defaults to driving.
 * @returns The directions service.
 */
export const createGoogleMapsDirections = (apiKey: string, config: IGoogleDirectionsConfig = {}): IMapDirections => ({
    maxStops: MAX_STOPS,
    getRoute: async (stops, options) => {
        if (stops.length < 2) {
            return null;
        }
        const [origin, ...rest] = stops;
        const destination = rest.pop() as IMapCoordinates;
        const response = await getJson<IGoogleRoutesResponse>(ROUTES_URL, {
            signal: options?.signal,
            headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELD_MASK },
            body: {
                origin: toWaypoint(origin),
                destination: toWaypoint(destination),
                intermediates: rest.map(toWaypoint),
                travelMode: config.travelMode ?? 'DRIVE',
                languageCode: options?.language
            }
        });
        return getGoogleRoutePath(response);
    }
});

/** Builds the Google Maps directions service with its defaults, for registration as a vendor capability. */
export const createGoogleMapsDirectionsService: IMapDirectionsFactory = (apiKey) => createGoogleMapsDirections(apiKey);
