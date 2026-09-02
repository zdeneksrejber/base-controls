import { IParameters, IStringProperty, ITwoOptionsProperty } from "@interfaces";
import { IControl, IOutputs } from "@interfaces/context";
import { IDataset } from "@talxis/client-libraries";
import { IMapTranslations } from "./translations";
import { IMapProviderOption, IMapProviderProps, IMapVendor } from "./providers";
import { IMapFallbackLocationResolver } from "./fallbackLocation";
import { IMapViewport, IMapViewportOptions } from "./viewport";

export interface IMap extends IControl<IMapParameters, IMapOutputs, IMapTranslations, IMapProviderProps> {
    /**
     * Providers the end user can switch between, replacing the vendors the manifest configures. Keyed by
     * `id`, so this list may be rebuilt on every render - but a changed config needs a new id.
     */
    onGetMapProviders?: () => IMapProviderOption[];
    /**
     * Vendors to offer on top of the built-in ones, built by the control from the manifest api keys. An
     * entry reusing a built-in id replaces it. Ignored once `onGetMapProviders` takes the list over.
     */
    onGetMapVendors?: () => IMapVendor[];
    /**
     * Resolves an approximate location to center on while the dataset has no pins. Unset by default - pass
     * `resolveLocationFromIpAddress` to opt into the third party call.
     */
    onResolveFallbackLocation?: IMapFallbackLocationResolver;
}

export interface IMapParameters extends IParameters {
    /** Records to draw as pins. Loading is the host's job; the control reads what is already loaded. */
    Dataset: IDataset;
    LatitudeAttributeName: IStringProperty;
    LongitudeAttributeName: IStringProperty;
    /** Groups pins into routes by shared non empty value. Routes of fewer than two pins are dropped. */
    RouteAttributeName?: IStringProperty;
    /**
     * Whether the control may add the link entity and column a dot notation attribute path needs when the
     * dataset does not already carry them. Defaults to true; the added column is hidden.
     */
    EnableAttributeLinking?: Omit<ITwoOptionsProperty, 'attributes'>;
    /** The end user's pick, reported back as the output of the same name. Wins over `DefaultVendor`. */
    MapProviderId?: IStringProperty;
    /** Whether the picker offers every configured vendor, instead of `DefaultVendor` alone. Defaults to true. */
    LetUserSwitch?: Omit<ITwoOptionsProperty, 'attributes'>;
    /** Vendor the map opens with. Defaults to `leaflet`, which an unconfigured id falls back to with a warning. */
    DefaultVendor?: IStringProperty;
    HereApiKey?: IStringProperty;
    MapyApiKey?: IStringProperty;
    /** Offers Google Maps once set, provided the host registered `googleMapsVendor` through `onGetMapVendors`. */
    GoogleApiKey?: IStringProperty;
    /** Api key of a vendor from `onGetMapVendors`, under the name its `apiKeyParameterName` declares. */
    [apiKeyParameterName: `${string}ApiKey`]: IStringProperty | undefined;
    /** Overrides the defaults used when deriving the viewport from the pins. Code only. */
    ViewportOptions?: {
        raw: IMapViewportOptions;
    };
}

export interface IMapOutputs extends IOutputs {
    /** Viewport the provider is showing, reported when the user pans or zooms. */
    Viewport?: IMapViewport;
    /** Provider the end user picked. Feed it back as the `MapProviderId` parameter to make the pick stick. */
    MapProviderId?: string;
}
