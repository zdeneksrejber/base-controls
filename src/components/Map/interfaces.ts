import { IParameters, IStringProperty, ITwoOptionsProperty, IWholeNumberProperty } from "@interfaces";
import { IControl, IOutputs } from "@interfaces/context";
import { IDataset } from "@talxis/client-libraries";
import { IMapTranslations } from "./translations";
import { IMapProviderOption, IMapProviderProps, IMapVendor } from "./providers";
import { IMapFallbackLocationResolver } from "./internal/fallbackLocation";
import { IMapPinResolver } from "./hooks/useMapClientApi";
import { IMapCardRenderers, IMapCardType } from "./internal/cards";
import { IMapClusteringOptions } from "./internal/clustering";
import { IMapFilterMode } from "./internal/mapFilters";
import { IMapPinLoading } from "./internal/records";
import { IMapViewport, IMapViewportOptions } from "./internal/viewport";

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
    /**
     * Card renderers on top of the built-in ones, keyed by card type. This is how Adaptive Cards are added:
     * import `ADAPTIVE_MAP_CARD_RENDERERS` from `.../Map/map-card/adaptive-card` and return it here, the way
     * Google Maps is registered through `onGetMapVendors`.
     */
    onGetCardRenderers?: () => IMapCardRenderers;
}

export interface IMapParameters extends IParameters {
    /** Records to draw as pins. Loading is the host's job; the control reads what is already loaded. */
    Dataset: IDataset;
    LatitudeAttributeName: IStringProperty;
    LongitudeAttributeName: IStringProperty;
    /** Groups pins into routes by shared non empty value. Routes of fewer than two pins are dropped. */
    RouteAttributeName?: IStringProperty;
    /** Orders the pins within a route. Without it they are drawn in dataset order. */
    RouteSequenceAttributeName?: IStringProperty;
    /** Colours a route. The first pin on it that has a value wins; without one the theme's primary is used. */
    RouteColorAttributeName?: IStringProperty;
    /**
     * Whether a route follows the road network instead of running straight between its pins, through
     * whichever configured vendor has a directions service. Off by default - it costs a request per route.
     */
    SnapRoutesToRoads?: Omit<ITwoOptionsProperty, 'attributes'>;
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
     * Card rules as a JSON array, matched exactly like `PinIcons`. Each entry says what activating a pin
     * does - `fields`, `adaptiveCard`, `function` or `none` - plus whatever that type needs, and the
     * `attributeName` and `value` a record must match for it.
     */
    Cards?: IStringProperty;
    /**
     * Attributes the default card shows, comma separated. Empty shows the dataset's first visible columns.
     */
    CardColumns?: IStringProperty;
    /** Card every pin opens unless a `Cards` rule says otherwise. Defaults to `fields`. */
    CardType?: Omit<ComponentFramework.PropertyTypes.EnumProperty<IMapCardType>, 'type'>;
    /** Adaptive Card template the default card renders, when `CardType` is `adaptiveCard`. */
    CardPayload?: IStringProperty;
    /**
     * Whether a pin can be dragged to move its record. **Off by default** - a map that moves records when a
     * finger slips is worse than one that does not move them at all.
     */
    EnablePinDragging?: Omit<ITwoOptionsProperty, 'attributes'>;
    /**
     * Whether clicking empty map creates a record there. **Off by default.** A record the control created
     * carries a delete button on its own pin.
     */
    EnablePinCreation?: Omit<ITwoOptionsProperty, 'attributes'>;
    /**
     * Whether the map centres on the user while the dataset has no pins, asking the browser first and
     * falling back to `onResolveFallbackLocation`. Off by default, because it prompts for permission.
     */
    PrefillUserLocation?: Omit<ITwoOptionsProperty, 'attributes'>;
    /** Attribute the resolved country is written to when a pin is moved or created. */
    CountryAttributeName?: IStringProperty;
    /** Attribute the resolved region is written to. */
    AdministrativeAreaAttributeName?: IStringProperty;
    /** Attribute the resolved town or city is written to. */
    LocalityAttributeName?: IStringProperty;
    /** Attribute the resolved district is written to. */
    SublocalityAttributeName?: IStringProperty;
    /** Attribute the resolved street is written to, without its number. */
    StreetAttributeName?: IStringProperty;
    /** Attribute the resolved street and number together are written to. */
    StreetNameAttributeName?: IStringProperty;
    /** Attribute the resolved house number is written to. */
    StreetNumberAttributeName?: IStringProperty;
    /** Attribute the resolved postal code is written to. */
    PostalCodeAttributeName?: IStringProperty;
    /**
     * Legend markup, shown over the map. Cleaned before it is inserted: scripts, event handlers and anything
     * that can load or submit are removed, while formatting, tables, images and inline SVG survive.
     */
    Legend?: IStringProperty;
    /** Web resource holding that markup instead. Wins over `Legend` once it loads. */
    LegendWebResourceName?: IStringProperty;
    /**
     * Whether the map draws the points of interest its vendor knows about. **Hidden by default**, so the
     * only pins are the records. Only Google Maps can switch this properly; HERE approximates it with a
     * lower detail style, and the other raster tile services ignore it.
     */
    ShowPointsOfInterest?: Omit<ITwoOptionsProperty, 'attributes'>;
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
