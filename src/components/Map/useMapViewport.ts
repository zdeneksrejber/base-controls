import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import deepEqual from 'fast-deep-equal/es6';
import { IMapProvider } from "./providers";
import { IMapFallbackLocationResolver } from "./fallbackLocation";
import { getApproximateMapViewport, getMapViewport, IMapCoordinates, IMapViewport, IMapViewportOptions } from "./viewport";

export interface IUseMapViewport {
    /** Pins the viewport is derived from. */
    locations: IMapCoordinates[];
    /** Component currently drawing the map. A different one is a fresh map that needs the handoff below. */
    provider: IMapProvider;
    /** Overrides the defaults used when deriving the viewport. */
    options?: IMapViewportOptions;
    /** Resolves an approximate location to center on while there are no pins. */
    onResolveFallbackLocation?: IMapFallbackLocationResolver;
    /** Called with the viewport the provider reports, deduplicated. */
    onChange: (viewport: IMapViewport) => void;
}

export interface IMapViewportController {
    /** Viewport to hand the provider. Its identity is what tells the provider to move the map. */
    viewport: IMapViewport;
    /** Hand this to the provider as its `onViewportChange`. */
    onViewportChange: (viewport: IMapViewport) => void;
}

//lets a fast loading dataset win the race and skip the fallback location call entirely
const FALLBACK_LOCATION_DEBOUNCE_MS = 400;
const FALLBACK_LOCATION_TIMEOUT_MS = 2500;

/**
 * Owns where the map looks: derives the viewport from the pins, keeps that decision stable across renders
 * and provider switches, and reports back what the provider is actually showing.
 *
 * The stability is the point. Providers apply the viewport whenever its identity changes, so a refresh that
 * returns the same records must not produce a new one, or it would pull the map back from wherever the user
 * had panned to.
 */
export const useMapViewport = (props: IUseMapViewport): IMapViewportController => {
    const { locations, provider, options, onResolveFallbackLocation, onChange } = props;
    const [fallbackLocation, setFallbackLocation] = useState<IMapCoordinates>();
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const hasLocations = locations.length > 0;

    useEffect(() => {
        if (!onResolveFallbackLocation || hasLocations) {
            return;
        }
        const controller = new AbortController();
        const debounce = setTimeout(() => {
            const timeout = setTimeout(() => controller.abort(), FALLBACK_LOCATION_TIMEOUT_MS);
            onResolveFallbackLocation(controller.signal)
                .then((location) => {
                    if (location && !controller.signal.aborted) {
                        setFallbackLocation(location);
                    }
                })
                .catch((error) => console.warn('Map: the fallback location resolver failed:', error))
                .finally(() => clearTimeout(timeout));
        }, FALLBACK_LOCATION_DEBOUNCE_MS);

        return () => {
            clearTimeout(debounce);
            controller.abort();
        };
    }, [onResolveFallbackLocation, hasLocations]);

    const derivedViewport = useMemo(() => {
        if (!hasLocations && fallbackLocation) {
            return getApproximateMapViewport(fallbackLocation, options);
        }
        return getMapViewport(locations, options);
    }, [locations, hasLocations, fallbackLocation, options]);

    const derivedViewportRef = useRef(derivedViewport);
    const appliedProviderRef = useRef(provider);
    const viewportRef = useRef(derivedViewport);
    const reportedViewportRef = useRef<IMapViewport>();
    const handoffViewportRef = useRef<IMapViewport>();

    //a new provider is a fresh map, hand it the view the user was on rather than the pins
    if (appliedProviderRef.current !== provider) {
        appliedProviderRef.current = provider;
        if (handoffViewportRef.current) {
            viewportRef.current = handoffViewportRef.current;
        }
    }

    //new records are a reason to move the map and outrank the handoff, reloading the same ones is not
    if (!deepEqual(derivedViewportRef.current, derivedViewport)) {
        derivedViewportRef.current = derivedViewport;
        viewportRef.current = derivedViewport;
    }

    const onViewportChange = useCallback((changedViewport: IMapViewport) => {
        if (deepEqual(reportedViewportRef.current, changedViewport)) {
            return;
        }
        reportedViewportRef.current = changedViewport;
        //bounds are left out on purpose - fitting them keeps the padding free and zooms out a notch per switch
        handoffViewportRef.current = {
            center: changedViewport.center,
            zoom: changedViewport.zoom,
            padding: changedViewport.padding
        };
        onChangeRef.current(changedViewport);
    }, []);

    return { viewport: viewportRef.current, onViewportChange };
};
