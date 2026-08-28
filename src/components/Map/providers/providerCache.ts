import { useRef } from 'react';
import deepEqual from 'fast-deep-equal/es6';
import { IMapProvider, IMapProviderOption } from './IMapProvider';

/** A provider the control is about to offer, before it has a cached component behind it. */
export interface IMapProviderSource extends Omit<IMapProviderOption, 'provider'> {
    /**
     * Identifies the configuration behind `id`, defaulting to `id` itself. A changed key is a different map,
     * so it rebuilds the provider - which is exactly what an edited api key should do, and what filling in an
     * unrelated vendor's key should not.
     */
    cacheKey?: string;
    /** Builds the provider. Called only when `cacheKey` is one the previous render did not offer. */
    createProvider: () => IMapProvider;
}

/**
 * Keeps one provider component per cache key for as long as that key keeps being offered, and the resolved
 * option list itself stable while it keeps resolving to the same ids, labels and providers.
 *
 * A fresh component identity remounts the map, so this is what lets a host rebuild its provider list every
 * render, and a maker edit one vendor's api key, without the map blinking. The cache is rebuilt on every call
 * rather than added to, so a key that stopped being offered does not stay alive in it. The option list is
 * stabilized the same way, so a caller that rebuilds its source list every render does not, on its own,
 * invalidate everything a consumer memoized on the result.
 *
 * Call the returned function once per render with the full list - it resolves, dedupes against the previous
 * result and swaps the cache in one go.
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
