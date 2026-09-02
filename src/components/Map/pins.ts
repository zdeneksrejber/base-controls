import { IRecord } from '@talxis/client-libraries';
import { getRecordCoordinate, getRecordValue } from './attributes';
import { IMapLocation, IMapRoute } from './providers';

export interface IMapPins {
    locations: IMapLocation[];
    routes: IMapRoute[];
}

/** Attribute names the pins are read under, resolved from the static input parameters. */
export interface IMapPinAttributes {
    latitude: string;
    longitude: string;
    route?: string;
}

export const EMPTY_MAP_PINS: IMapPins = { locations: [], routes: [] };

/**
 * Reads one record's pin.
 *
 * @param record Record to read.
 * @param attributes Attribute paths the coordinates are held under.
 * @returns The location, or `undefined` when the record carries no readable coordinates.
 */
const getLocation = (record: IRecord, attributes: IMapPinAttributes): IMapLocation | undefined => {
    const latitude = getRecordCoordinate(record, attributes.latitude);
    const longitude = getRecordCoordinate(record, attributes.longitude);
    if (latitude === undefined || longitude === undefined) {
        return undefined;
    }
    const name = record.getNamedReference()?.name;
    return {
        id: record.getRecordId(),
        latitude,
        longitude,
        label: typeof name === 'string' ? name : undefined
    };
};

/**
 * Reads the route a record belongs to.
 *
 * @param record Record to read.
 * @param attributes Attribute paths, whose `route` entry names the grouping attribute.
 * @returns The route id, or `undefined` when no attribute is configured or the record's value is empty.
 */
const getRouteId = (record: IRecord, attributes: IMapPinAttributes): string | undefined => {
    if (!attributes.route) {
        return undefined;
    }
    const value = getRecordValue(record, attributes.route);
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    return `${value}`;
};

/**
 * Reads the pins off the loaded records.
 *
 * @param records Records to draw.
 * @param attributes Attribute paths the coordinates and the route grouping are held under.
 * @returns The locations in dataset order, and the routes of two pins or more.
 */
export const getMapPins = (records: IRecord[], attributes: IMapPinAttributes): IMapPins => {
    const locations: IMapLocation[] = [];
    //a Map, not an object - object keys that look like integers would reorder the routes
    const routeLocations = new Map<string, IMapLocation[]>();
    records.forEach((record, index) => {
        try {
            const location = getLocation(record, attributes);
            if (!location) {
                return;
            }
            locations.push(location);
            const routeId = getRouteId(record, attributes);
            if (!routeId) {
                return;
            }
            const route = routeLocations.get(routeId);
            if (route) {
                route.push(location);
                return;
            }
            routeLocations.set(routeId, [location]);
        } catch (error) {
            console.warn(`Map: failed to read the location of the record on index ${index}:`, error);
        }
    });
    return {
        locations,
        //a route needs at least two pins to be drawable
        routes: [...routeLocations]
            .filter(([, route]) => route.length > 1)
            .map(([id, route]) => ({ id, locations: route }))
    };
};
