import { useCallback } from 'react';
import { IMapFallbackLocationResolver } from './fallbackLocation';
import { IMapCoordinates } from './viewport';

/** How long the browser is given to answer before the IP fallback is used instead. */
const GEOLOCATION_TIMEOUT_MS = 8000;

/**
 * Asks the browser where the user is.
 *
 * @param signal Aborts the wait when the control stops caring.
 * @returns The position, or `null` when the browser has none or the user declined.
 */
const getBrowserLocation = (signal?: AbortSignal): Promise<IMapCoordinates | null> =>
    new Promise((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            resolve(null);
            return;
        }
        const onAbort = () => resolve(null);
        signal?.addEventListener('abort', onAbort, { once: true });
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
            //a decline is an answer, not a failure - the caller falls back to whatever else it has
            () => resolve(null),
            { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: GEOLOCATION_TIMEOUT_MS }
        );
    });

export interface IUseUserLocation {
    /** Resolver used when the browser has no position, typically the opt-in IP lookup. */
    onResolveFallbackLocation?: IMapFallbackLocationResolver;
}

/**
 * Resolves where the user is, for prefilling a pin when the dataset has none.
 *
 * The browser is asked first, because it is the only source precise enough to drop a pin on. A user who
 * declines, or a browser with nothing to say, falls through to whatever fallback resolver the host passed -
 * which is approximate, and deliberately so.
 *
 * @param props The fallback resolver.
 * @returns A function that resolves the user's position, or `null` when nothing can.
 */
export const useUserLocation = (props: IUseUserLocation) => {
    const onResolveFallbackLocation = props.onResolveFallbackLocation;

    return useCallback(async (signal?: AbortSignal): Promise<IMapCoordinates | null> => {
        const browserLocation = await getBrowserLocation(signal);
        if (browserLocation) {
            return browserLocation;
        }
        if (!onResolveFallbackLocation || signal?.aborted) {
            return null;
        }
        try {
            return await onResolveFallbackLocation(signal ?? new AbortController().signal);
        } catch (error) {
            console.warn('Map: could not resolve the user location:', error);
            return null;
        }
    }, [onResolveFallbackLocation]);
};
