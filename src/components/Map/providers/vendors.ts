import { useEffect, useRef } from 'react';
import deepEqual from 'fast-deep-equal/es6';
import { IMapProvider, IMapProviderOption } from './IMapProvider';
import { useMapProviderCache } from './providerCache';
import { createLeafletMapProvider } from './leaflet';
import { createHereMapsProvider } from './here-maps';
import { createMapyProvider } from './mapy';

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
 * from `.../Map/providers/google-maps` instead, registered through `onGetMapVendors` like any other vendor.
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
 * Merges host registered vendors into the built-in list. An entry reusing a built-in id replaces it in place,
 * the rest are appended in the order given, which is the order the picker lists them in.
 */
export const getMapVendors = (hostVendors?: IMapVendor[]): IMapVendor[] => {
    if (!hostVendors?.length) {
        return BUILT_IN_MAP_VENDORS;
    }
    //a Map keeps the position of a key it already holds, which is what makes an override a replacement
    const merged = new Map(BUILT_IN_MAP_VENDORS.map((vendor) => [vendor.id, vendor]));
    hostVendors.forEach((vendor) => merged.set(vendor.id, vendor));
    return [...merged.values()];
};

export interface IMapVendorOptions {
    /** Vendors to consider, in picker order. */
    vendors: IMapVendor[];
    /**
     * Reads the raw value of an api key parameter by the name a vendor declares. An empty value counts as no
     * key at all, since that is what an unset manifest property looks like.
     */
    getApiKey: (parameterName: string) => string | undefined;
    /** Whether every configured vendor is offered, or only `defaultVendorId`. */
    letUserSwitch: boolean;
    /** Vendor the map opens with, and the only one offered while `letUserSwitch` is off. */
    defaultVendorId: string;
    /**
     * Whether this vendor list is the one actually drawing the map, rather than one a host took over with
     * `onGetMapProvider`/`onGetMapProviders`. A misconfigured `defaultVendorId` only warns while it is - a
     * vendor list nothing is drawn from has nothing to warn about.
     */
    active: boolean;
}

/**
 * Resolves the manifest vendors and api keys into the provider list the control offers.
 *
 * Descriptors are plain data, so the caller may rebuild them every render; what stays stable is the provider
 * built from one, cached per vendor and api key. Filling in one vendor's key therefore does not remount
 * another vendor's map, while changing a key does rebuild the provider it configures.
 */
export const useMapVendorOptions = (options: IMapVendorOptions): IMapProviderOption[] => {
    const { vendors, getApiKey, letUserSwitch, defaultVendorId, active } = options;
    const resolveOptions = useMapProviderCache();
    const offeredRef = useRef<IMapProviderOption[]>([]);

    const configured = resolveOptions(vendors
        //a keyless vendor is configured by definition, so it reads as an empty key rather than a missing one
        .map((vendor) => ({
            vendor,
            apiKey: vendor.apiKeyParameterName ? getApiKey(vendor.apiKeyParameterName) || undefined : ''
        }))
        //a vendor that needs a key stays off the list until the maker fills it in
        .filter((entry): entry is { vendor: IMapVendor; apiKey: string } => entry.apiKey !== undefined)
        .map(({ vendor, apiKey }) => ({
            id: vendor.id,
            label: vendor.label,
            cacheKey: `${vendor.id}|${apiKey}`,
            createProvider: () => vendor.createProvider(apiKey)
        })));

    const picked = configured.find((option) => option.id === defaultVendorId);
    //a misconfigured default is invisible on the map itself, it just opens on something else
    const warning = active && !picked && configured.length
        ? `Map: DefaultVendor is "${defaultVendorId}", but no vendor with that id is configured - using "${configured[0].id}" instead.`
        : undefined;
    useEffect(() => {
        if (warning) {
            console.warn(warning);
        }
    }, [warning]);

    const offered = letUserSwitch ? configured : picked ? [picked] : configured.slice(0, 1);
    //compared rather than replaced, so a rebuilt list does not invalidate everything memoized on it
    if (!deepEqual(offeredRef.current, offered)) {
        offeredRef.current = offered;
    }
    return offeredRef.current;
};
