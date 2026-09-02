import { IParameters, IStringProperty, ITwoOptionsProperty, IWholeNumberProperty } from "@interfaces";
import { IControl, IOutputs } from "@interfaces/context";
import { IDataset } from "@talxis/client-libraries";
import { IMapTranslations } from "./translations";
import { IMapProviderOption, IMapProviderProps, IMapVendor } from "./providers";
import { IMapFallbackLocationResolver } from "./fallbackLocation";
import { IMapPinResolver } from "./clientApi";
import { IMapClusteringOptions } from "./clustering";
import { IMapFilterMode } from "./mapFilters";
import { IMapPinLoading } from "./records";
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
    /**
     * Works out how a record's pin looks, in code. Takes precedence over the Client API web resource and the
     * `PinIcons` rules, and returning nothing for a record falls through to them.
     */
    onResolvePin?: IMapPinResolver;
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
    /**
     * Which records to draw: `page` draws the page the host loaded, `all` draws every page of the view.
     * Defaults to `page`.
     */
    PinLoading?: Omit<ComponentFramework.PropertyTypes.EnumProperty<IMapPinLoading>, 'type'>;
    /** Records to load before stopping, while `PinLoading` is `all`. Defaults to 50000. */
    MaxRecords?: Omit<IWholeNumberProperty, 'attributes'>;
    /**
     * Pin rules as a JSON array, in the shape the legacy MapPicker used. Each entry is an appearance -
     * `color`, `url`, `webResourceName`, `svg` - plus the `attributeName` and `value` a record must match.
     * The first matching rule wins, so a rule with no `attributeName` is the fallback and belongs last.
     */
    PinIcons?: IStringProperty;
    /**
     * Web resource holding the Client API function, for rules configuration cannot express. Called once with
     * the dataset and the registration methods, exactly as the dataset control's own Client API is.
     */
    ClientApiWebresourceName?: IStringProperty;
    /** Function inside that web resource. Both are needed for the Client API to run. */
    ClientApiFunctionName?: IStringProperty;
    /**
     * Whether pins that overlap in the current view are drawn as one, carrying the number of records behind
     * it. Defaults to true - it is what keeps a dataset of thousands readable.
     */
    EnableClustering?: Omit<ITwoOptionsProperty, 'attributes'>;
    /** Overrides the grouping radius, zoom ceiling and how many members a group lists. Code only. */
    ClusteringOptions?: {
        raw: IMapClusteringOptions;
    };
    /**
     * Attribute holding a record's full address. A record with no readable coordinates is placed by
     * geo-coding it, through whichever configured vendor has a geo-coding service. Unset turns that off.
     */
    FullAddressAttributeName?: IStringProperty;
    /** Addresses to geo-code before stopping, per set of records. Defaults to 250. */
    MaxGeocodingRequests?: Omit<IWholeNumberProperty, 'attributes'>;
    /**
     * Attributes the filter panel offers, comma separated. Each becomes a list of the values the loaded
     * records actually hold. Empty hides the panel.
     */
    FilterAttributeNames?: IStringProperty;
    /**
     * Where a filter applies: `pins` filters what the map draws and works on any provider, `dataset` pushes
     * it to the bound dataset so every control sharing it follows. Defaults to `pins`.
     */
    FilterMode?: Omit<ComponentFramework.PropertyTypes.EnumProperty<IMapFilterMode>, 'type'>;
    /**
     * Whether the map hosts its own search box. Off by default, because a map inside `DatasetControl`
     * already has quick find in that control's header and two boxes would be one too many.
     */
    EnableSearch?: Omit<ITwoOptionsProperty, 'attributes'>;
    /**
     * Whether that box also offers places from the geo-coding service, which move the map without filtering
     * the records. Defaults to true, and has no effect unless `EnableSearch` is on.
     */
    EnableAddressSearch?: Omit<ITwoOptionsProperty, 'attributes'>;
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
