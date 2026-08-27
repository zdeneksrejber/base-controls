import { IParameters, IStringProperty, ITwoOptionsProperty } from "@interfaces";
import { IControl, IOutputs } from "@interfaces/context";
import { IDataset } from "@talxis/client-libraries";
import { IMapTranslations } from "./translations";
import { IMapProvider, IMapProviderOption, IMapProviderProps, IMapVendor } from "./providers";
import { IMapFallbackLocationResolver } from "./fallbackLocation";
import { IMapViewport, IMapViewportOptions } from "./viewport";

export interface IMap extends IControl<IMapParameters, IMapOutputs, IMapTranslations, IMapProviderProps> {
    /**
     * The component that draws the map, replacing the vendors the manifest configures. Defaults to the
     * keyless Leaflet/OpenStreetMap provider. Return a stable component - a new identity remounts the map.
     */
    onGetMapProvider?: () => IMapProvider;
    /**
     * Providers the end user can switch between, replacing the vendors the manifest configures. Keyed by
     * `id`, so this list may be rebuilt on every render. Wins over `onGetMapProvider`.
     */
    onGetMapProviders?: () => IMapProviderOption[];
    /**
     * Vendors to offer on top of the built-in ones, built by the control from the manifest api keys. An
     * entry reusing a built-in id replaces it. Ignored once `onGetMapProvider(s)` takes the list over.
     */
    onGetMapVendors?: () => IMapVendor[];
    /**
     * Resolves an approximate location to center on while the dataset has no pins. Unset by default - pass
     * `resolveLocationFromIpAddress` to opt into the third party call.
     */
    onResolveFallbackLocation?: IMapFallbackLocationResolver;
}

/**
 * Every entry below except `Dataset` and `ViewportOptions` is a static manifest input: `LetUserSwitch` is a
 * `TwoOptions` property, the rest are `SingleLine.Text`. See the README for the manifest and how to bind it.
 */
export interface IMapParameters extends IParameters {
    /** Records to draw as pins. Loading is the host's job; the control reads what is already loaded. */
    Dataset: IDataset;
    /** Attribute holding the latitude of a record. */
    LatitudeAttributeName: IStringProperty;
    /** Attribute holding the longitude of a record. */
    LongitudeAttributeName: IStringProperty;
    /**
     * Attribute that groups pins into routes. Records sharing a non empty value form one route in dataset
     * order; routes with less than two pins are dropped. Leave the raw value empty to draw no routes.
     */
    RouteAttributeName?: IStringProperty;
    /**
     * Provider the map opens with - the end user's own pick rather than a configuration decision. They
     * switch in the picker, the pick comes back as the `MapProviderId` output, and a host that feeds it back
     * in makes it stick. Wins over `DefaultVendor` while it has a value, so usually bound rather than static.
     */
    MapProviderId?: IStringProperty;
    /**
     * Whether the picker offers every configured vendor, instead of drawing `DefaultVendor` alone. Defaults
     * to `true`. Ignored once `onGetMapProvider(s)` takes the list over.
     */
    LetUserSwitch?: Omit<ITwoOptionsProperty, 'attributes'>;
    /**
     * Vendor the map opens with - `here`, `mapy`, `google`, or one registered through `onGetMapVendors`.
     * Defaults to `leaflet`, which an id with no configured vendor behind it also falls back to, with a
     * warning. With `LetUserSwitch` off this is the only vendor drawn.
     */
    DefaultVendor?: IStringProperty;
    /** [HERE](https://www.here.com/developer) api key. Offers the built-in HERE vendor once set. */
    HereApiKey?: IStringProperty;
    /** [Mapy.com](https://developer.mapy.com/) api key. Offers the built-in Mapy.com vendor once set. */
    MapyApiKey?: IStringProperty;
    /**
     * Google Maps api key. Offers the Google Maps vendor once set, provided the host registered
     * `googleMapsVendor` from `.../Map/providers/GoogleMaps` - that import is what pulls the optional
     * `@vis.gl/react-google-maps` peer dependency into the build, which is why it is not done here.
     */
    GoogleApiKey?: IStringProperty;
    /**
     * Api key of a vendor registered through `onGetMapVendors`, under the name its `apiKeyParameterName`
     * declares. Keys are read by name, so a vendor added later is a new optional manifest property and
     * nothing else.
     */
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
