import { IParameters, IStringProperty, ITwoOptionsProperty, IWholeNumberProperty } from "@interfaces";
import { IControl, IOutputs } from "@interfaces/context";
import { IDataset } from "@talxis/client-libraries";
import { IMapTranslations } from "./translations";
import { IMapProviderOption, IMapProviderProps, IMapRoute, IMapVendor } from "./providers";
import { IMapFallbackLocationResolver } from "./internal/fallbackLocation";
import { IMapCardRenderers, IMapCardType, IMapClusterMemberRenderer } from "./internal/cards";
import { IMapClusteringOptions } from "./internal/clustering";
import { IMapFilterMode } from "./internal/mapFilters";
import { IMapPinResolver } from "./internal/pinAppearance";
import { IMapPinLoading } from "./internal/records";
import { IMapViewport, IMapViewportOptions } from "./internal/viewport";

export interface IMap extends IControl<IMapParameters, IMapOutputs, IMapTranslations, IMapProviderProps> {
    /**
     * Providers the end user can switch between, replacing the vendors the manifest configures. The list may
     * be rebuilt on every render, as long as each entry's `provider` keeps its identity.
     */
    onGetMapProviders?: () => IMapProviderOption[];
    /**
     * Vendors to offer on top of the built-in ones, built by the control from the manifest api keys. A
     * vendor's key is read from the parameters bag under the name its `apiKeyParameterName` declares, so a
     * consuming manifest adds a string property of that name. An entry reusing a built-in id replaces it.
     * Ignored once `onGetMapProviders` takes the list over.
     */
    onGetMapVendors?: () => IMapVendor[];
    /**
     * Resolves an approximate location to center on while the dataset has no pins. Unset by default - pass
     * `resolveLocationFromIpAddress` to opt into the third party call.
     */
    onResolveFallbackLocation?: IMapFallbackLocationResolver;
    /**
     * Decides, per route, whether its line is drawn at all. Absent draws every route. Filtering happens
     * before road snapping, so a route the host hides never costs a directions request either.
     */
    onFilterRoutes?: (route: IMapRoute) => boolean;
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
    /**
     * Renders one row of the list a grouped pin opens. The default row is the record's pin and primary name;
     * a host shows what tells its records apart instead. A record's full card opens only once its row is picked.
     */
    onRenderClusterMember?: IMapClusterMemberRenderer;
    /** Overrides the grouping radius, zoom ceiling and how many members a group lists. */
    clusteringOptions?: IMapClusteringOptions;
    /** Overrides the defaults used when deriving the viewport from the pins. */
    viewportOptions?: IMapViewportOptions;
}

/** A two options parameter, which carries no option set metadata. */
type IMapSwitch = Omit<ITwoOptionsProperty, 'attributes'>;

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
    SnapRoutesToRoads?: IMapSwitch;
    /**
     * Whether the control may add the link entity and column a dot notation attribute path needs when the
     * dataset does not already carry them. Defaults to true; the added column is hidden.
     */
    EnableAttributeLinking?: IMapSwitch;
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
    EnablePinDragging?: IMapSwitch;
    /**
     * Whether clicking empty map creates a record there. **Off by default.** A record the control created
     * carries a delete button on its own pin.
     */
    EnablePinCreation?: IMapSwitch;
    /**
     * Whether the map centres on the user while the dataset has no pins, asking the browser first and
     * falling back to `onResolveFallbackLocation`. Off by default, because it prompts for permission.
     */
    PrefillUserLocation?: IMapSwitch;
    /**
     * Where a resolved address is written when a pin is moved or created, as a JSON object mapping `IAddress`
     * components to attribute paths: `{ "locality": "address1_city", "postalCode": "address1_postalcode" }`.
     * The usual components are `country`, `administrativeArea` (region), `locality` (town or city),
     * `subLocality` (district), `street` (without its number), `streetNumber` and `postalCode`. A component
     * left out is not written. Empty writes only the coordinates.
     */
    AddressAttributeNames?: IStringProperty;
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
    ShowPointsOfInterest?: IMapSwitch;
    /**
     * Whether pins that overlap in the current view are drawn as one, carrying the number of records behind
     * it. Defaults to true - it is what keeps a dataset of thousands readable.
     */
    EnableClustering?: IMapSwitch;
    /**
     * Attribute holding a record's full address. A record with no readable coordinates is placed by
     * geo-coding it, through whichever configured vendor has a geo-coding service. Unset turns that off.
     */
    FullAddressAttributeName?: IStringProperty;
    /**
     * Addresses to geo-code before stopping, per refresh of the dataset - a refresh that brings the same
     * records back costs nothing while their results are still remembered. Overrides both the control's own
     * default of 250 and the lower number a public service asks for where its coordinates cannot be written back.
     */
    MaxGeocodingRequests?: Omit<IWholeNumberProperty, 'attributes'>;
    /**
     * Whether a geo-coded coordinate is saved to its record, through the same latitude and longitude
     * attributes the map reads. Defaults to true: it is what makes an address cost one lookup ever instead
     * of one per person who opens the map, which is what a public service's usage policy asks of a caller.
     *
     * Turn it off where the map may not write - the coordinate attributes are calculated, the reader has no
     * privilege on them, or the churn on `modifiedon` is not wanted - and coordinates are then remembered
     * for the lifetime of the control alone.
     */
    PersistGeocodedCoordinates?: IMapSwitch;
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
    EnableSearch?: IMapSwitch;
    /**
     * Whether that box also offers places from the geo-coding service, which move the map without filtering
     * the records. Defaults to true, and has no effect unless `EnableSearch` is on.
     */
    EnableAddressSearch?: IMapSwitch;
    /**
     * The end user's pick, reported back as the output of the same name. Wins over `DefaultMapProviderId`.
     * Carries a vendor id (`leaflet`, `google`, `here`, `mapy`, or one from `onGetMapVendors`) or the id of an
     * option from `onGetMapProviders`.
     */
    MapProviderId?: IStringProperty;
    /** Whether the picker offers every configured provider, instead of the default alone. Defaults to true. */
    EnableProviderSwitching?: IMapSwitch;
    /**
     * Provider the map opens with, by the same id `MapProviderId` carries. Defaults to `leaflet`, which an
     * unconfigured id falls back to with a warning.
     */
    DefaultMapProviderId?: IStringProperty;
    HereApiKey?: IStringProperty;
    MapyApiKey?: IStringProperty;
    /** Offers Google Maps once set, provided the host registered `googleMapsVendor` through `onGetMapVendors`. */
    GoogleApiKey?: IStringProperty;
}

export interface IMapOutputs extends IOutputs {
    /** Viewport the provider is showing, reported when the user pans or zooms. */
    Viewport?: IMapViewport;
    /** Provider the end user picked. Feed it back as the `MapProviderId` parameter to make the pick stick. */
    MapProviderId?: string;
}
