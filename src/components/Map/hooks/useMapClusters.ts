import { useMemo } from 'react';
import { createMapClusterIndex, IMapClusteringOptions, WORLD_BOUNDS } from '../internal/clustering';
import { IMapLocation } from '../providers';
import { IMapViewport } from '../internal/viewport';

export interface IUseMapClusters {
    /** Every pin the dataset produced. */
    locations: IMapLocation[];
    /** Whether pins that overlap in the current view are drawn as one. */
    enabled: boolean;
    /** What the map is showing, so grouping follows the user rather than the pins. */
    visibleViewport: IMapViewport;
    options?: IMapClusteringOptions;
}

/**
 * Reduces the pins to the ones the map should draw for what it is currently showing.
 *
 * The index is built once per set of pins and queried per view, so panning a dataset of thousands costs a
 * lookup rather than a rebuild.
 */
export const useMapClusters = (props: IUseMapClusters): IMapLocation[] => {
    const { locations, enabled, visibleViewport, options } = props;
    const radius = options?.radius;
    const maxZoom = options?.maxZoom;
    const maxLeaves = options?.maxLeaves;

    const index = useMemo(
        () => (enabled ? createMapClusterIndex(locations, { radius, maxZoom, maxLeaves }) : undefined),
        [locations, enabled, radius, maxZoom, maxLeaves]
    );

    const bounds = visibleViewport.bounds;
    const zoom = visibleViewport.zoom;

    return useMemo(
        () => (index ? index.getLocations(bounds ?? WORLD_BOUNDS, zoom) : locations),
        [index, locations, bounds, zoom]
    );
};
