import { useEffect } from 'react';
import { IMapDirections } from '../directions';
import { IMapGeocoder } from '../geocoding';
import { IMapProvider, IMapProviderOption } from './IMapProvider';
import { useMapProviderCache } from './providerCache';
import { createLeafletMapProvider, createNominatimGeocoder, createOsrmDirections } from './leaflet';
import { createHereMapsProvider, createHereMapsGeocoder, createHereMapsDirectionsService } from './here-maps';
import { createMapyProvider, createMapyGeocoder, createMapyDirectionsService } from './mapy';

/**
 * A map vendor the control can build a provider for on its own, from an api key configured in the manifest -
 * what `LetUserSwitch`, `DefaultVendor` and the `<Vendor>ApiKey` parameters are resolved against. Contrast
 * with `IMapProviderOption`, which carries an already built provider.
 */
export interface IMapVendor {
    /** Public api - the value `DefaultVendor` and `MapProviderId` carry, typed into the manifest by a maker. */
    id: string;
    /** Shown in the picker. Not translated, because vendor names are proper nouns. */
    label: string;
    /** Parameter holding this vendor's api key. Omit for a keyless vendor; it is offered once the key is set. */
    apiKeyParameterName?: string;
    /** Builds the provider. Cached per vendor and api key, so it reruns only on a key change. */
    createProvider: (apiKey: string) => IMapProvider;
    /**
     * Builds the vendor's geocoding service, used for the address fallback, the address search and the
     * reverse geocoding behind pin editing. Omit for a vendor that has none.
     */
    createGeocoder?: (apiKey: string) => IMapGeocoder;
    /**
     * Builds the vendor's directions service, used to snap a route to the road network. Omit for a vendor
     * that has none.
     */
    createDirections?: (apiKey: string) => IMapDirections;
}

/** Vendor the map opens with while `DefaultVendor` is empty. Keyless, so it is always configured. */
export const DEFAULT_MAP_VENDOR_ID = 'leaflet';

//one instance shared by every control - a fresh component identity is what remounts a map
export const DEFAULT_MAP_PROVIDER = createLeafletMapProvider();

/**
 * Vendors every control resolves out of the box. Google Maps is deliberately absent: importing it here would
 * put the optional `@vis.gl/react-google-maps` peer dependency in every consumer's build graph. It ships as
 * `googleMapsVendor` from `.../Map/providers/google-maps`, registered through `onGetMapVendors`.
 */
const BUILT_IN_MAP_VENDORS: IMapVendor[] = [
    {
        id: DEFAULT_MAP_VENDOR_ID,
        label: 'OpenStreetMap',
        createProvider: () => DEFAULT_MAP_PROVIDER,
        createGeocoder: () => createNominatimGeocoder(),
        createDirections: () => createOsrmDirections()
    },
    {
        id: 'here',
        label: 'HERE',
        apiKeyParameterName: 'HereApiKey',
        createProvider: (apiKey) => createHereMapsProvider({ apiKey }),
        createGeocoder: createHereMapsGeocoder,
        createDirections: createHereMapsDirectionsService
    },
    {
        id: 'mapy',
        label: 'Mapy.com',
        apiKeyParameterName: 'MapyApiKey',
        createProvider: (apiKey) => createMapyProvider({ apiKey }),
        createGeocoder: createMapyGeocoder,
        createDirections: createMapyDirectionsService
    }
];

/** Merges host registered vendors into the built-ins. An entry reusing a built-in id replaces it in place. */
export const getMapVendors = (hostVendors?: IMapVendor[]): IMapVendor[] => {
    if (!hostVendors?.length) {
        return BUILT_IN_MAP_VENDORS;
    }
    //a Map keeps the position of a key it already holds, which is what makes an override a replacement
    const merged = new Map(BUILT_IN_MAP_VENDORS.map((vendor) => [vendor.id, vendor]));
    hostVendors.forEach((vendor) => merged.set(vendor.id, vendor));
    return [...merged.values()];
};

interface IMapVendorOptions {
    vendors: IMapVendor[];
    /** An empty value counts as no key at all, which is what an unset manifest property looks like. */
    getApiKey: (parameterName: string) => string | undefined;
    letUserSwitch: boolean;
    defaultVendorId: string;
    /** Whether this list is drawing the map. A list a host took over has no misconfiguration to warn about. */
    active: boolean;
}

/**
 * Resolves the manifest vendors and api keys into the provider list the control offers. Descriptors are plain
 * data, so the caller may rebuild them every render; the provider built from one is cached per vendor and key.
 */
export const useMapVendorOptions = (options: IMapVendorOptions): IMapProviderOption[] => {
    const { vendors, getApiKey, letUserSwitch, defaultVendorId, active } = options;
    const resolveOptions = useMapProviderCache();

    const configured = resolveOptions(vendors
        //a keyless vendor is configured by definition, so it reads as an empty key rather than a missing one
        .map((vendor) => ({
            vendor,
            apiKey: vendor.apiKeyParameterName ? getApiKey(vendor.apiKeyParameterName) || undefined : ''
        }))
        .filter((entry): entry is { vendor: IMapVendor; apiKey: string } => entry.apiKey !== undefined)
        .map(({ vendor, apiKey }) => ({
            id: vendor.id,
            label: vendor.label,
            cacheKey: `${vendor.id}|${apiKey}`,
            createProvider: () => vendor.createProvider(apiKey),
            createGeocoder: vendor.createGeocoder && (() => vendor.createGeocoder!(apiKey)),
            createDirections: vendor.createDirections && (() => vendor.createDirections!(apiKey))
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

    //the picker only renders from two options up, so the single-vendor arrays need no stable identity
    return letUserSwitch ? configured : picked ? [picked] : configured.slice(0, 1);
};
