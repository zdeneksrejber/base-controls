import { ComponentType } from 'react';
import { IContext } from '@interfaces';
import { ITheme } from '@legacy';
import { IMapCoordinates, IMapViewport } from '../viewport';
import { IMapLabels } from '../translations';

export interface IMapLocation extends IMapCoordinates {
    /** Id of the dataset record the pin was built from. */
    id: string;
    /** Primary name of that record, for tooltips and popups instead of a raw record id. */
    label?: string;
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
 *
 * Adding a member here is additive for consumers but silently leaves existing providers without the new
 * behaviour, so the surface is deliberately declared in full up front.
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
    /** Context of the host control, for providers needing user settings, formatting or the web API. */
    context: IContext;
    /** Theme of the host control, so provider chrome matches the rest of the app. */
    theme: ITheme;
    /** Labels of the Map control resolved for the current language. */
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
    /** Shown in the picker, falling back to `id`. Host supplied, because vendor names are proper nouns. */
    label?: string;
    /** Component that draws the map, built the same way as the one `onGetMapProvider` returns. */
    provider: IMapProvider;
}
