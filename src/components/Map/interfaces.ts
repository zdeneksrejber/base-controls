import { IParameters, IStringProperty, ITwoOptionsProperty, IWholeNumberProperty } from "@interfaces";
import { IControl, IOutputs } from "@interfaces/context";
import { IDataset } from "@talxis/client-libraries";
import { IMapTranslations } from "./labels";
import { IMapProviderDefinition, IMapProviderProps } from "./providers/provider";
import { IMapPinResolver } from "./core/pinAppearance";
import { IMapViewport, IMapViewportOptions } from "./core/viewport";
import { IMapModules } from "./modules/interfaces";

export interface IMap extends IControl<IMapParameters, IMapOutputs, IMapTranslations, IMapProviderProps> {
    /**
     * The features this map runs with. A feature is on because its module is here, so a map with no
     * `modules` draws pins and nothing else. Build each one with its `create<Name>Module` function.
     *
     * The set of keys has to stay the same for the lifetime of the control - a changed set remounts the map.
     */
    modules?: IMapModules;
    /**
     * Map providers on top of the built-in OpenStreetMap, HERE and Mapy.com. An entry reusing a built-in
     * id replaces it. This is how Google Maps is added: import `googleMapsProvider` from
     * `.../Map/providers/google-maps` and pass it here. The list may be rebuilt on every render.
     */
    providers?: IMapProviderDefinition[];
    /**
     * Works out how a record's pin looks, in code. Takes precedence over the modules and the `PinRules`
     * parameter, and returning nothing for a record falls through to them.
     */
    onResolvePin?: IMapPinResolver;
    /** Overrides the defaults used when deriving where the map looks from the pins. */
    viewportOptions?: IMapViewportOptions;
}

/** A two options parameter, which carries no option set metadata. */
export type IMapSwitch = Omit<ITwoOptionsProperty, 'attributes'>;

/** A whole number parameter, which carries no number metadata. */
export type IMapNumber = Omit<IWholeNumberProperty, 'attributes'>;

/**
 * What the core control reads from the manifest. Everything a module needs is an option of that module
 * instead, so a PCF wrapper maps its own manifest properties onto the modules it turns on.
 */
export interface IMapParameters extends IParameters {
    /** Records to draw as pins. Loading is the host's job; the control reads what is already loaded. */
    Dataset: IDataset;
    /** Attribute holding a record's latitude. Dot notation reaches across a lookup: `cds_addressid.cds_latitude`. */
    LatitudeAttributeName: IStringProperty;
    /** Attribute holding a record's longitude. */
    LongitudeAttributeName: IStringProperty;
    /**
     * Whether the control may add the columns a dot notation attribute needs when the dataset does not
     * already carry them. On by default; the added columns are hidden. Turn it off for a host that manages
     * its own dataset columns.
     */
    AutoAddLinkedColumns?: IMapSwitch;
    /**
     * Whether every page of the view is drawn, instead of the page the host loaded. Off by default. The
     * pages are loaded on a copy of the dataset, so the host's own paging is left alone.
     */
    LoadAllPages?: IMapSwitch;
    /** Records to load before stopping, while `LoadAllPages` is on. Defaults to 50000. */
    MaxRecords?: IMapNumber;
    /**
     * Pin rules as a JSON array. Each entry is an appearance - `color`, `url`, `webResourceName`, `svg` -
     * plus the `attributeName` and `value` a record must match. The first matching rule wins, so a rule
     * with no `attributeName` is the fallback and belongs last. Same shape as the legacy MapPicker's
     * `pinIcons`.
     */
    PinRules?: IStringProperty;
    /**
     * Whether the map draws the points of interest its provider knows about. **Hidden by default**, so the
     * only pins are the records. Only Google Maps can switch this properly; HERE approximates it with a
     * lower detail style, and the other raster tile services ignore it.
     */
    ShowPointsOfInterest?: IMapSwitch;
    /** The end user's pick, reported back as the output of the same name. Wins over `DefaultProvider`. */
    MapProviderId?: IStringProperty;
    /** Provider the map opens with. Defaults to `leaflet`, which an unconfigured id falls back to with a warning. */
    DefaultProvider?: IStringProperty;
    /** Whether the picker offers every configured provider, instead of `DefaultProvider` alone. On by default. */
    EnableProviderSwitching?: IMapSwitch;
    HereApiKey?: IStringProperty;
    MapyApiKey?: IStringProperty;
    /** Offers Google Maps once set, provided the host passed `googleMapsProvider` through `providers`. */
    GoogleApiKey?: IStringProperty;
    /** Api key of a provider from `providers`, under the name its `apiKeyParameterName` declares. */
    [apiKeyParameterName: `${string}ApiKey`]: IStringProperty | undefined;
}

export interface IMapOutputs extends IOutputs {
    /** Viewport the provider is showing, reported when the user pans or zooms. */
    Viewport?: IMapViewport;
    /** Provider the end user picked. Feed it back as the `MapProviderId` parameter to make the pick stick. */
    MapProviderId?: string;
}
