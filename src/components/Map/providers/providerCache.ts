import { useRef } from 'react';
import deepEqual from 'fast-deep-equal/es6';
import { IMapDirections } from '../directions';
import { IMapGeocoder } from '../geocoding';
import { IMapProvider, IMapProviderOption } from './IMapProvider';

export interface IMapProviderSource extends Omit<IMapProviderOption, 'provider' | 'geocoder' | 'directions'> {
    /** Identifies the configuration behind `id`, defaulting to `id`. A changed key rebuilds everything below. */
    cacheKey?: string;
    createProvider: () => IMapProvider;
    /** Builds the geocoding service this provider offers. Omit for one that offers none. */
    createGeocoder?: () => IMapGeocoder;
    /** Builds the directions service this provider offers. Omit for one that offers none. */
    createDirections?: () => IMapDirections;
}

interface ICachedProvider {
    provider: IMapProvider;
    geocoder?: IMapGeocoder;
    directions?: IMapDirections;
}

/**
 * Keeps one provider, geocoder and directions service per cache key, and the resolved list stable while it
 * resolves to the same thing. A fresh component identity remounts the map, and a fresh geocoder drops its
 * cache, so this is what lets a host rebuild its provider list every render, and a maker edit one vendor's
 * api key, without the map blinking or the geocoding starting over.
 *
 * Call once per render with the full list - the cache is rebuilt rather than added to, so a key that stopped
 * being offered does not stay alive in it.
 */
export const useMapProviderCache = () => {
    const cacheRef = useRef<{ [cacheKey: string]: ICachedProvider }>({});
    const optionsRef = useRef<IMapProviderOption[]>([]);

    return (sources: IMapProviderSource[]): IMapProviderOption[] => {
        const cache: { [cacheKey: string]: ICachedProvider } = {};
        const options = sources.map(({ id, label, cacheKey, createProvider, createGeocoder, createDirections }) => {
            const key = cacheKey ?? id;
            const cached = cacheRef.current[key] ?? {
                provider: createProvider(),
                geocoder: createGeocoder?.(),
                directions: createDirections?.()
            };
            cache[key] = cached;
            return { id, label, ...cached };
        });
        cacheRef.current = cache;
        if (!deepEqual(optionsRef.current, options)) {
            optionsRef.current = options;
        }
        return optionsRef.current;
    };
};
