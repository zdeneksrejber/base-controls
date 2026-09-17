import { IMapDirections } from '../internal/directions';
import { IMapGeocoder } from '../internal/geocoding';
import { IMapProvider } from './provider';

/**
 * A map vendor the control can build a provider for on its own, from an api key configured in the manifest -
 * what `EnableProviderSwitching`, `DefaultMapProviderId` and the `<Vendor>ApiKey` parameters are resolved
 * against - on the manifest, every vendor is simply a provider a maker can name. Contrast
 * with `IMapProviderOption`, which carries an already built provider.
 */
export interface IMapVendor {
    /** Public api - the value `DefaultMapProviderId` and `MapProviderId` carry, typed into the manifest by a maker. */
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

/** Vendor the map opens with while `DefaultMapProviderId` is empty. Keyless, so it is always configured. */
export const DEFAULT_MAP_VENDOR_ID = 'leaflet';
