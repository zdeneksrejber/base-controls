import { useRef } from 'react';
import deepEqual from 'fast-deep-equal/es6';
import { IMapProvider, IMapProviderOption } from './IMapProvider';

export interface IMapProviderSource extends Omit<IMapProviderOption, 'provider'> {
    /** Identifies the configuration behind `id`, defaulting to `id`. A changed key rebuilds the provider. */
    cacheKey?: string;
    createProvider: () => IMapProvider;
}

/**
 * Keeps one provider component per cache key, and the resolved list stable while it resolves to the same
 * thing. A fresh component identity remounts the map, so this is what lets a host rebuild its provider list
 * every render, and a maker edit one vendor's api key, without the map blinking.
 *
 * Call once per render with the full list - the cache is rebuilt rather than added to, so a key that stopped
 * being offered does not stay alive in it.
 */
export const useMapProviderCache = () => {
    const cacheRef = useRef<{ [cacheKey: string]: IMapProvider }>({});
    const optionsRef = useRef<IMapProviderOption[]>([]);

    return (sources: IMapProviderSource[]): IMapProviderOption[] => {
        const cache: { [cacheKey: string]: IMapProvider } = {};
        const options = sources.map(({ id, label, cacheKey, createProvider }) => {
            const key = cacheKey ?? id;
            const provider = cacheRef.current[key] ?? createProvider();
            cache[key] = provider;
            return { id, label, provider };
        });
        cacheRef.current = cache;
        if (!deepEqual(optionsRef.current, options)) {
            optionsRef.current = options;
        }
        return optionsRef.current;
    };
};
