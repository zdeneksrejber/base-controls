import { IMapProvider, IMapProviderProps } from '../IMapProvider';
import { LeafletMap } from '../Leaflet';

/**
 * Styles the [HERE Raster Tile API v3](https://www.here.com/docs/category/raster-tile-api-v3) renders. The
 * authoritative list for an api key is what `GET https://maps.hereapi.com/v3/info` returns.
 */
export type IHereMapsStyle =
    | 'dem'
    | 'explore.day'
    | 'explore.night'
    | 'explore.satellite.day'
    | 'lite.day'
    | 'lite.night'
    | 'lite.satellite.day'
    | 'logistics.day'
    | 'logistics.night'
    | 'logistics.satellite.day'
    | 'satellite.day'
    | 'topo.day'
    | 'topo.night';

/** Layer a tile carries: the whole map, labels alone for stacking over imagery, no labels, or land only. */
export type IHereMapsResource = 'base' | 'background' | 'blank' | 'label';

export type IHereMapsFormat = 'png' | 'png8' | 'jpeg';

/** Edge length of a tile image. Both cover the same area, so 512 is the retina option, not a zoom shift. */
export type IHereMapsTileSize = 256 | 512;

/** Pixels per inch a tile is rendered for. Larger values scale up labels and road widths. */
export type IHereMapsPpi = 100 | 200 | 400;

export interface IHereMapsConfig {
    /**
     * HERE api key, from a project on the [HERE platform](https://www.here.com/developer). Sent as a query
     * parameter on every tile request, so restrict it to the origins allowed to use it.
     */
    apiKey: string;
    /** Style rendered while the control theme is light. Defaults to `explore.day`. */
    style?: IHereMapsStyle;
    /**
     * Style rendered while the control theme is dark. Defaults to `explore.night`. HERE renders the dark map
     * itself, so its tiles are never CSS inverted.
     */
    darkStyle?: IHereMapsStyle;
    /** Layer of the map to request. Defaults to `base`. */
    resource?: IHereMapsResource;
    /** Image format. Defaults to `png8`, smallest for a vector drawn map. Prefer `jpeg` for satellite. */
    format?: IHereMapsFormat;
    /** Edge length of a tile image. Defaults to 512, which keeps the map sharp on a high density display. */
    size?: IHereMapsTileSize;
    /** Pixels per inch a tile is rendered for. Defaults to the HERE default of 100. */
    ppi?: IHereMapsPpi;
    /** BCP 47 tag the labels use, e.g. `cs-CZ`. Defaults to what HERE picks for the region a tile covers. */
    lang?: string;
    /** Attribution shown in the corner. Defaults to the HERE notice their terms require - reword, don't remove. */
    attribution?: string;
}

const TILE_ENDPOINT = 'https://maps.hereapi.com/v3';
//mercator is the only projection the api serves
const PROJECTION = 'mc';
const DEFAULT_STYLE: IHereMapsStyle = 'explore.day';
const DEFAULT_DARK_STYLE: IHereMapsStyle = 'explore.night';
const DEFAULT_RESOURCE: IHereMapsResource = 'base';
const DEFAULT_FORMAT: IHereMapsFormat = 'png8';
const DEFAULT_TILE_SIZE: IHereMapsTileSize = 512;
//deepest zoom the api serves, past the Leaflet default of 18
const MAX_ZOOM = 20;

const getAttribution = () => `&copy; ${new Date().getFullYear()} <a href="https://legal.here.com/terms" target="_blank" rel="noreferrer noopener">HERE</a>`;

const getTileLayerUrl = (config: IHereMapsConfig, style: IHereMapsStyle): string => {
    const parameters = new URLSearchParams({
        apiKey: config.apiKey,
        style,
        size: `${config.size ?? DEFAULT_TILE_SIZE}`
    });
    if (config.ppi) {
        parameters.set('ppi', `${config.ppi}`);
    }
    if (config.lang) {
        parameters.set('lang', config.lang);
    }
    const resource = config.resource ?? DEFAULT_RESOURCE;
    const format = config.format ?? DEFAULT_FORMAT;
    //the tile coordinates stay literal, Leaflet substitutes them
    return `${TILE_ENDPOINT}/${resource}/${PROJECTION}/{z}/{x}/{y}/${format}?${parameters.toString()}`;
};

const HereMapsMap = (props: IMapProviderProps & IHereMapsConfig) => {
    const style = props.theme.isInverted
        ? props.darkStyle ?? DEFAULT_DARK_STYLE
        : props.style ?? DEFAULT_STYLE;

    return (
        <LeafletMap
            {...props}
            tileLayerUrl={getTileLayerUrl(props, style)}
            attribution={props.attribution ?? getAttribution()}
            maxZoom={MAX_ZOOM}
            //HERE has a night style, so the tiles arrive dark instead of being filtered
            invertTilesInDarkTheme={false} />
    );
};

/**
 * Provider backed by the HERE Raster Tile API v3. Needs nothing but an api key - the tiles are plain XYZ
 * raster images, so there is no HERE sdk to install. Dark mode swaps the HERE style rather than filtering
 * the tiles, so it is a real dark map instead of an inverted light one.
 */
export const createHereMapsProvider = (config: IHereMapsConfig): IMapProvider => {
    return (props: IMapProviderProps) => <HereMapsMap {...props} {...config} />;
};
