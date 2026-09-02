import { IRecord } from '@talxis/client-libraries';
import { getRecordCoordinate, getRecordValue } from './attributes';
import { IMapLocation, IMapRoute } from './providers';
import { IMapCoordinates } from './viewport';

export interface IMapPins {
    locations: IMapLocation[];
    routes: IMapRoute[];
    /**
     * Records no coordinates could be read from. The address fallback may still place them, and anything
     * left here after that simply has nowhere to be drawn.
     */
    unplacedRecords: IRecord[];
}

/** Attribute names the pins are read under, resolved from the static input parameters. */
export interface IMapPinAttributes {
    latitude: string;
    longitude: string;
    route?: string;
}

/** Coordinates resolved some other way than off the record - by geo-coding an address - keyed by record id. */
export interface IMapFallbackCoordinates {
    [recordId: string]: IMapCoordinates | undefined;
}

export const EMPTY_MAP_PINS: IMapPins = { locations: [], routes: [], unplacedRecords: [] };

/**
 * Reads one record's pin.
 *
 * @param record Record to read.
 * @param attributes Attribute paths the coordinates are held under.
 * @param fallbackCoordinates Coordinates resolved elsewhere, used when the record carries none.
 * @returns The location, or `undefined` when the record cannot be placed at all.
 */
const getLocation = (
    record: IRecord,
    attributes: IMapPinAttributes,
    fallbackCoordinates?: IMapFallbackCoordinates
): IMapLocation | undefined => {
    const id = record.getRecordId();
    let latitude = getRecordCoordinate(record, attributes.latitude);
    let longitude = getRecordCoordinate(record, attributes.longitude);
    if (latitude === undefined || longitude === undefined) {
        const fallback = fallbackCoordinates?.[id];
        if (!fallback) {
            return undefined;
        }
        latitude = fallback.latitude;
        longitude = fallback.longitude;
    }
    const name = record.getNamedReference()?.name;
    return {
        id,
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
 * @param fallbackCoordinates Coordinates the address fallback resolved, keyed by record id.
 * @returns The locations in dataset order, the routes of two pins or more, and the records left unplaced.
 */
export const getMapPins = (
    records: IRecord[],
    attributes: IMapPinAttributes,
    fallbackCoordinates?: IMapFallbackCoordinates
): IMapPins => {
    const locations: IMapLocation[] = [];
    const unplacedRecords: IRecord[] = [];
    //a Map, not an object - object keys that look like integers would reorder the routes
    const routeLocations = new Map<string, IMapLocation[]>();
    records.forEach((record, index) => {
        try {
            const location = getLocation(record, attributes, fallbackCoordinates);
            if (!location) {
                unplacedRecords.push(record);
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
        unplacedRecords,
        //a route needs at least two pins to be drawable
        routes: [...routeLocations]
            .filter(([, route]) => route.length > 1)
            .map(([id, route]) => ({ id, locations: route }))
    };
};
