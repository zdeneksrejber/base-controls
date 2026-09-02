import Supercluster from 'supercluster';
import { IMapLocation } from './providers';
import { IMapBounds } from './viewport';

/** Pixels within which two pins overlap enough to be drawn as one. */
export const DEFAULT_CLUSTER_RADIUS = 40;

/** Zoom from which pins are always drawn separately, however close together they are. */
export const DEFAULT_CLUSTER_MAX_ZOOM = 20;

/** Member records a cluster lists, which is what its card can show without becoming useless. */
export const DEFAULT_CLUSTER_MAX_LEAVES = 50;

/** Box covering the whole world, used before the map has reported what it is showing. */
export const WORLD_BOUNDS: IMapBounds = { north: 85, south: -85, east: 180, west: -180 };

export interface IMapClusteringOptions {
    /** Pixels within which pins merge. Larger groups more aggressively. */
    radius?: number;
    /** Zoom from which pins never merge. */
    maxZoom?: number;
    /** Member records a cluster lists. The count is always exact, however many are listed. */
    maxLeaves?: number;
}

/** What a pin standing for several records knows about the group behind it. */
export interface IMapClusterInfo {
    /** How many records the pin stands for. Always exact. */
    count: number;
    /** Ids of those records in dataset order, up to `maxLeaves` of them. */
    recordIds: string[];
    /** Zoom at which this group breaks apart, so clicking it can zoom in usefully. */
    expansionZoom: number;
}

export interface IMapClusterIndex {
    /**
     * The pins to draw for one view of the map: a record on its own stays itself, records that overlap
     * become one pin carrying the group.
     */
    getLocations(bounds: IMapBounds, zoom: number): IMapLocation[];
}

interface IClusterPointProperties {
    /** Position of the location in the array the index was built from. */
    locationIndex: number;
}

/**
 * Builds a clustering index over a set of pins.
 *
 * Clustering is the control's job rather than a provider's, so all four vendors group identically and a
 * dataset of thousands of records costs the map only the pins inside its current view. The index is built
 * once per set of pins; querying it per viewport is cheap.
 *
 * @param locations Every pin the dataset produced.
 * @param options Radius, zoom ceiling and how many members a cluster lists.
 * @returns An index that answers with the pins to draw for a given view.
 */
export const createMapClusterIndex = (
    locations: IMapLocation[],
    options: IMapClusteringOptions = {}
): IMapClusterIndex => {
    const maxLeaves = options.maxLeaves ?? DEFAULT_CLUSTER_MAX_LEAVES;
    const index = new Supercluster<IClusterPointProperties>({
        radius: options.radius ?? DEFAULT_CLUSTER_RADIUS,
        maxZoom: options.maxZoom ?? DEFAULT_CLUSTER_MAX_ZOOM,
        minPoints: 2
    });

    index.load(locations.map((location, locationIndex) => ({
        type: 'Feature' as const,
        properties: { locationIndex },
        geometry: { type: 'Point' as const, coordinates: [location.longitude, location.latitude] }
    })));

    const getClusterInfo = (clusterId: number, count: number): IMapClusterInfo => ({
        count,
        recordIds: index.getLeaves(clusterId, maxLeaves)
            .map((leaf) => locations[leaf.properties.locationIndex]?.id)
            .filter((id): id is string => !!id),
        expansionZoom: index.getClusterExpansionZoom(clusterId)
    });

    return {
        getLocations: (bounds, zoom) => {
            //supercluster indexes by integer zoom, and a map may sit between two levels
            const clusters = index.getClusters(
                [bounds.west, bounds.south, bounds.east, bounds.north],
                Math.round(zoom)
            );
            return clusters.map((feature) => {
                const [longitude, latitude] = feature.geometry.coordinates;
                const properties = feature.properties as Supercluster.ClusterProperties & IClusterPointProperties;
                if (!properties.cluster) {
                    return locations[properties.locationIndex];
                }
                return {
                    id: `cluster-${properties.cluster_id}`,
                    latitude,
                    longitude,
                    cluster: getClusterInfo(properties.cluster_id, properties.point_count)
                };
            }).filter((location): location is IMapLocation => !!location);
        }
    };
};
