import { useEffect, useRef } from 'react';
import { IMapProvider, IMapProviderOption } from './IMapProvider';
import { createLeafletMapProvider } from './Leaflet';
import { createHereMapsProvider } from './HereMaps';
import { createMapyProvider } from './Mapy';

/**
 * A map vendor the control can build a provider for on its own, from an api key configured in the manifest.
 * This is what `LetUserSwitch`, `DefaultVendor` and the `<Vendor>ApiKey` parameters are resolved against.
 *
 * Contrast with `IMapProviderOption`, which carries an already built provider: a vendor is what one is built
 * *from*, so adding one is a descriptor plus an optional manifest property, not a change to the control.
 */
export interface IMapVendor {
    /** Public api - the value `DefaultVendor` and `MapProviderId` carry, typed into the manifest by a maker. */
    id: string;
    /** Shown in the picker. Not translated, because vendor names are proper nouns. */
    label: string;
    /**
     * Parameter holding this vendor's api key, `HereApiKey` for HERE. The vendor is offered only once that
     * parameter has a value; leave it out for a keyless vendor such as the OpenStreetMap default.
     */
    apiKeyParameterName?: string;
    /**
     * Builds the provider from the raw value of `apiKeyParameterName` - already known to be non empty, and
     * an empty string for a keyless vendor. Cached per vendor and api key, so it reruns only on a key change.
     */
    createProvider: (apiKey: string) => IMapProvider;
}

/** Vendor the map opens with while `DefaultVendor` is empty. Keyless, so it is always configured. */
export const DEFAULT_MAP_VENDOR_ID = 'leaflet';

/**
 * The keyless Leaflet/OpenStreetMap provider, as one instance shared by every control - a fresh component
 * identity is what remounts a map, so building one per control would remount for no reason.
 */
export const DEFAULT_MAP_PROVIDER = createLeafletMapProvider();

/**
 * Vendors every control resolves out of the box.
 *
 * Google Maps is deliberately absent: it needs the optional `@vis.gl/react-google-maps` peer dependency, and
 * importing it here would put that package in every consumer's build graph. It ships as `googleMapsVendor`
 * from `.../Map/providers/GoogleMaps` instead, registered through `onGetMapVendors` like any other vendor.
 */
export const BUILT_IN_MAP_VENDORS: IMapVendor[] = [
    {
        id: DEFAULT_MAP_VENDOR_ID,
        label: 'OpenStreetMap',
        createProvider: () => DEFAULT_MAP_PROVIDER
    },
    {
        id: 'here',
        label: 'HERE',
        apiKeyParameterName: 'HereApiKey',
        createProvider: (apiKey) => createHereMapsProvider({ apiKey })
    },
    {
        id: 'mapy',
        label: 'Mapy.com',
        apiKeyParameterName: 'MapyApiKey',
        createProvider: (apiKey) => createMapyProvider({ apiKey })
    }
];

/**
 * Merges host registered vendors into the built-in list. An entry reusing a built-in id replaces it, the
 * rest are appended in the order given, which is the order the picker lists them in.
 */
export const getMapVendors = (hostVendors?: IMapVendor[]): IMapVendor[] => {
    if (!hostVendors?.length) {
        return BUILT_IN_MAP_VENDORS;
    }
    const overrides = hostVendors.filter((vendor) => BUILT_IN_MAP_VENDORS.some((builtIn) => builtIn.id === vendor.id));
    const added = hostVendors.filter((vendor) => !overrides.includes(vendor));
    return [
        ...BUILT_IN_MAP_VENDORS.map((builtIn) => overrides.find((override) => override.id === builtIn.id) ?? builtIn),
        ...added
    ];
};

export interface IMapVendorOptions {
    /** Vendors to consider, in picker order. */
    vendors: IMapVendor[];
    /** Reads the raw value of an api key parameter by the name a vendor declares. */
    getApiKey: (parameterName: string) => string | undefined;
    /** Whether every configured vendor is offered, or only `defaultVendorId`. */
    letUserSwitch: boolean;
    /** Vendor the map opens with, and the only one offered while `letUserSwitch` is off. */
    defaultVendorId: string;
}

const isSameOptions = (left: IMapProviderOption[], right: IMapProviderOption[]): boolean =>
    left.length === right.length &&
    left.every((option, index) =>
        option.id === right[index].id &&
        option.label === right[index].label &&
        option.provider === right[index].provider);

/**
 * Resolves the manifest vendors and api keys into the provider list the control offers.
 *
 * Descriptors are plain data, so the caller may rebuild them every render; what stays stable is the provider
 * built from one, cached per vendor and api key. Filling in one vendor's key therefore does not remount
 * another vendor's map, while changing a key does rebuild the provider it configures.
 */
export const useMapVendorOptions = (options: IMapVendorOptions): IMapProviderOption[] => {
    const { vendors, getApiKey, letUserSwitch, defaultVendorId } = options;
    const providerCacheRef = useRef<{ [cacheKey: string]: IMapProvider }>({});
    const offeredRef = useRef<IMapProviderOption[]>([]);
    //rebuilt rather than added to, so a key the maker edited does not stay cached
    const providerCache: { [cacheKey: string]: IMapProvider } = {};
    const configured: IMapProviderOption[] = [];

    vendors.forEach((vendor) => {
        const apiKey = vendor.apiKeyParameterName ? getApiKey(vendor.apiKeyParameterName) : undefined;
        //a vendor that needs a key stays off the list until the maker fills it in
        if (vendor.apiKeyParameterName && !apiKey) {
            return;
        }
        const cacheKey = `${vendor.id}|${apiKey ?? ''}`;
        const provider = providerCacheRef.current[cacheKey] ?? vendor.createProvider(apiKey ?? '');
        providerCache[cacheKey] = provider;
        configured.push({ id: vendor.id, label: vendor.label, provider });
    });
    providerCacheRef.current = providerCache;

    const picked = configured.find((option) => option.id === defaultVendorId);
    //a misconfigured default is invisible on the map itself, it just opens on something else
    const warning = picked || !configured.length
        ? undefined
        : `Map: DefaultVendor is "${defaultVendorId}", but no vendor with that id is configured - using "${configured[0].id}" instead.`;
    useEffect(() => {
        if (warning) {
            console.warn(warning);
        }
    }, [warning]);

    const offered = letUserSwitch ? configured : picked ? [picked] : configured.slice(0, 1);
    //compared rather than replaced, so a rebuilt list does not invalidate everything memoized on it
    if (!isSameOptions(offeredRef.current, offered)) {
        offeredRef.current = offered;
    }
    return offeredRef.current;
};
