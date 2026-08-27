export interface IMapCoordinates {
    latitude: number;
    longitude: number;
}

export interface IMapBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

export interface IMapViewport {
    /** Point to center on when the provider does not fit `bounds`. */
    center: IMapCoordinates;
    /** Zoom that belongs to `center`. Providers that fit `bounds` can ignore it. */
    zoom: number;
    /**
     * Only set when the viewport came from more than one location. Providers that can fit bounds should
     * prefer them over `center` and `zoom`, keeping `padding` free around them.
     */
    bounds?: IMapBounds;
    /** Space in pixels to keep between `bounds` and the edges of the map. */
    padding: number;
}

export interface IMapViewportOptions {
    /** Center used when there is no location to derive the viewport from. */
    fallbackCenter?: IMapCoordinates;
    /** Zoom used together with `fallbackCenter`. */
    fallbackZoom?: number;
    /**
     * Zoom used for a single location, since fitting bounds around one point collapses to maximum zoom.
     * Doubles as the upper bound of the estimated zoom.
     */
    singleLocationZoom?: number;
    /**
     * Zoom used for an approximate location. Deliberately low - such a location can be off by a city or two
     * and a tight zoom would make that obvious.
     */
    approximateLocationZoom?: number;
    /** Space in pixels providers should keep between the bounds and the edges of the map. */
    padding?: number;
}

export const DEFAULT_MAP_VIEWPORT_OPTIONS: Required<IMapViewportOptions> = {
    //Czechia, used only when there is nothing better to center on
    fallbackCenter: { latitude: 49.8175, longitude: 15.4730 },
    fallbackZoom: 6,
    singleLocationZoom: 15,
    approximateLocationZoom: 8,
    padding: 48
};

/**
 * The smallest box containing every coordinate, or `undefined` when there is nothing to contain. Sets that
 * cross the antimeridian are not detected and produce a box spanning the long way around.
 */
export const getMapBounds = (coordinates: IMapCoordinates[]): IMapBounds | undefined => {
    if (coordinates.length === 0) {
        return undefined;
    }
    let north = coordinates[0].latitude;
    let south = coordinates[0].latitude;
    let east = coordinates[0].longitude;
    let west = coordinates[0].longitude;
    for (const coordinate of coordinates) {
        north = Math.max(north, coordinate.latitude);
        south = Math.min(south, coordinate.latitude);
        east = Math.max(east, coordinate.longitude);
        west = Math.min(west, coordinate.longitude);
    }
    return { north, south, east, west };
};

//rough inverse of the Web Mercator zoom math, for providers that cannot fit bounds themselves
const getZoomForSpan = (span: number, worldSpan: number, maxZoom: number): number => {
    if (span <= 0) {
        return maxZoom;
    }
    return Math.max(0, Math.min(maxZoom, Math.floor(Math.log2(worldSpan / span))));
};

/**
 * Derives the viewport for the given coordinates. The single place the control decides where to look, so
 * every provider stays a thin renderer instead of reimplementing the rules.
 */
export const getMapViewport = (coordinates: IMapCoordinates[], options?: IMapViewportOptions): IMapViewport => {
    const { fallbackCenter, fallbackZoom, singleLocationZoom, padding } = { ...DEFAULT_MAP_VIEWPORT_OPTIONS, ...options };
    if (coordinates.length === 0) {
        return { center: fallbackCenter, zoom: fallbackZoom, padding };
    }
    if (coordinates.length === 1) {
        return {
            center: { latitude: coordinates[0].latitude, longitude: coordinates[0].longitude },
            zoom: singleLocationZoom,
            padding
        };
    }
    const bounds = getMapBounds(coordinates)!;
    return {
        center: {
            latitude: (bounds.north + bounds.south) / 2,
            longitude: (bounds.east + bounds.west) / 2
        },
        zoom: Math.min(
            getZoomForSpan(bounds.east - bounds.west, 360, singleLocationZoom),
            getZoomForSpan(bounds.north - bounds.south, 180, singleLocationZoom)
        ),
        bounds,
        padding
    };
};

/** Derives the viewport for a roughly known location, for example one resolved from an IP address. */
export const getApproximateMapViewport = (coordinates: IMapCoordinates, options?: IMapViewportOptions): IMapViewport => {
    const { approximateLocationZoom, padding } = { ...DEFAULT_MAP_VIEWPORT_OPTIONS, ...options };
    return {
        center: { latitude: coordinates.latitude, longitude: coordinates.longitude },
        zoom: approximateLocationZoom,
        padding
    };
};
