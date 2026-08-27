import { IMapCoordinates } from "./viewport";

/**
 * Resolves an approximate location the map can center on while the dataset has no pins. Receives an
 * `AbortSignal` the control aborts once it stops caring, and should resolve `null` rather than throw.
 */
export type IMapFallbackLocationResolver = (signal: AbortSignal) => Promise<IMapCoordinates | null>;

const GEOJS_ENDPOINT = 'https://get.geojs.io/v1/ip/geo.json';

/**
 * Guesses the user location from their IP address using the public geojs.io service.
 *
 * Opt in only - pass it as `onResolveFallbackLocation` when the host is allowed to call a third party. The
 * control never calls it on its own, so a host under a CSP or a privacy review makes no surprise requests.
 */
export const resolveLocationFromIpAddress: IMapFallbackLocationResolver = async (signal) => {
    try {
        const response = await fetch(GEOJS_ENDPOINT, { signal });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        const latitude = parseFloat(data.latitude);
        const longitude = parseFloat(data.longitude);
        if (isNaN(latitude) || isNaN(longitude)) {
            return null;
        }
        return { latitude, longitude };
    } catch {
        return null;
    }
};
