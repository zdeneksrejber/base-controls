import { IRecord } from "@talxis/client-libraries";
import { IMapLocation, IMapRoute } from "./providers";

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

const toCoordinate = (value: any): number | undefined => {
    const coordinate = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(coordinate) ? undefined : coordinate;
};

const getLocation = (record: IRecord, attributes: IMapPinAttributes): IMapLocation | undefined => {
    const latitude = toCoordinate(record.getValue(attributes.latitude));
    const longitude = toCoordinate(record.getValue(attributes.longitude));
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

const getRouteId = (record: IRecord, attributes: IMapPinAttributes): string | undefined => {
    if (!attributes.route) {
        return undefined;
    }
    const value = record.getValue(attributes.route);
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    return `${value}`;
};

/** Reads the pins off the loaded records. One the coordinates cannot be read from is skipped, not fatal. */
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
