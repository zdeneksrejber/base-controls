import { ComponentType } from 'react';
import { IContext } from '@interfaces';
import { ITheme } from '@legacy';
import { IMapClusterInfo } from '../clustering';
import { IMapPinAppearance } from '../pinAppearance';
import { IMapDirections } from '../directions';
import { IMapGeocoder } from '../geocoding';
import { IMapCoordinates, IMapViewport } from '../viewport';
import { IMapLabels } from '../translations';

export interface IMapLocation extends IMapCoordinates {
    /** Id of the dataset record the pin was built from, or `cluster-<n>` for a pin standing for several. */
    id: string;
    /** Primary name of that record, for tooltips and popups instead of a raw record id. */
    label?: string;
    /**
     * The group this pin stands for, set only when the control merged several overlapping records into it.
     * A provider draws such a pin with its `count` on it.
     */
    cluster?: IMapClusterInfo;
    /**
     * How to draw this pin, when the control worked out something other than the default. Absent means the
     * shipped pin in the theme's primary colour.
     */
    pin?: IMapPinAppearance;
}

export interface IMapRoute {
    /** Value of the `RouteAttributeName` attribute shared by every location on this route. */
    id: string;
    /** Locations in dataset order. Providers should connect them into a single line. */
    locations: IMapLocation[];
}

/**
 * Everything a provider receives from the Map control. Providers are thin renderers: the control decides
 * what to show and where to look, the provider only translates that into its own map API.
 */
export interface IMapProviderProps {
    /** Pins to render, in dataset order. */
    locations: IMapLocation[];
    /** Lines to render. Empty unless the `RouteAttributeName` parameter names an attribute. */
    routes: IMapRoute[];
    /**
     * Where to look. Apply it whenever the object identity changes and do not recompute it - the control
     * holds the identity stable while the derived viewport does not change, so a refresh returning the same
     * records does not pull the map back from wherever the user panned to.
     */
    viewport: IMapViewport;
    /** Ids of the locations currently selected in the bound dataset. */
    selectedLocationIds: string[];
    context: IContext;
    /** Theme of the host control, so provider chrome matches the rest of the app. */
    theme: ITheme;
    labels: IMapLabels;
    /** Call when the user activates a pin. The control turns it into a dataset selection. */
    onLocationClick: (location: IMapLocation) => void;
    /** Call when the user pans or zooms. The control reports it as the `Viewport` output. */
    onViewportChange: (viewport: IMapViewport) => void;
}

export type IMapProvider = ComponentType<IMapProviderProps>;

/** One entry of the provider list a host offers through `onGetMapProviders`. */
export interface IMapProviderOption {
    /**
     * Identifies the provider. Carried by the `MapProviderId` parameter and output, and the key the control
     * caches the component under - so it identifies the configuration too, and a changed config needs a new id.
     */
    id: string;
    /** Shown in the picker, falling back to `id`. */
    label?: string;
    provider: IMapProvider;
    /** Turns addresses into coordinates and back. Omit for a provider with no geocoding service. */
    geocoder?: IMapGeocoder;
    /** Snaps routes to the road network. Omit for a provider with no directions service. */
    directions?: IMapDirections;
}
