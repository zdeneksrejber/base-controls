import { IMapCoordinates } from "./viewport";

/** A location the control resolved to center on, and how much it can be trusted to zoom in on. */
export interface IMapResolvedLocation extends IMapCoordinates {
    /**
     * Whether the position is precise enough to zoom in on. A device position is; a position guessed from
     * an IP address can be off by a city, so the map stays zoomed out for one.
     */
    isPrecise?: boolean;
}

/**
 * Resolves a location the map can center on while the dataset has no pins. Receives an `AbortSignal` the
 * control aborts once it stops caring, and should resolve `null` rather than throw.
 */
export type IMapFallbackLocationResolver = (signal: AbortSignal) => Promise<IMapResolvedLocation | null>;

export interface IMapFallbackLocationState {
    /** Whether the map already has something to fit. */
    hasLocations: boolean;
    /** Whether the host is still fetching records. */
    isDatasetLoading: boolean;
    /** Whether the control is still draining the remaining pages of the view. */
    isLoadingAllRecords: boolean;
    /** Whether addresses are still being geo-coded into coordinates. */
    isGeocoding: boolean;
}

/**
 * Whether the control should resolve a fallback location at all. Pins produce "not yet", not "nothing", so
 * anything that could still produce one blocks the fallback - getting this wrong means a location
 * permission prompt shown over a dataset that was merely slow, which the user should never see.
 */
export const shouldResolveFallbackLocation = (state: IMapFallbackLocationState): boolean =>
    !state.hasLocations
    && !state.isDatasetLoading
    && !state.isLoadingAllRecords
    && !state.isGeocoding;

const GEOJS_ENDPOINT = 'https://get.geojs.io/v1/ip/geo.json';

/**
 * Guesses the user location from their IP address using the public geojs.io service. Opt in only - the
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
