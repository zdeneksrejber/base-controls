import { IRecord } from '@talxis/client-libraries';
import { getRecordCoordinate, getRecordValue } from './attributes';
import { IMapPinAppearance, isEmptyPinAppearance } from './pinAppearance';
import { IMapLocation, IMapRoute } from '../providers';
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
    /** Groups pins into one line by shared value. */
    route?: string;
    /** Orders the pins within a line. Without it they are drawn in dataset order. */
    routeSequence?: string;
    /** Colours the line. The first non empty value on the route wins. */
    routeColor?: string;
}

/** Coordinates resolved some other way than off the record - by geo-coding an address - keyed by record id. */
export interface IMapFallbackCoordinates {
    [recordId: string]: IMapCoordinates | undefined;
}

export interface IMapPinOptions {
    attributes: IMapPinAttributes;
    /** Coordinates the address fallback resolved, used for records that carry none of their own. */
    fallbackCoordinates?: IMapFallbackCoordinates;
    /** Works out how a record's pin should look. Returning nothing draws the shipped pin. */
    getAppearance?: (record: IRecord) => IMapPinAppearance | undefined;
}

export const EMPTY_MAP_PINS: IMapPins = { locations: [], routes: [], unplacedRecords: [] };

/** One pin on a route, with what the route needs to order and colour itself. */
interface IRouteStop {
    location: IMapLocation;
    /** Value of the sequence attribute, or `undefined` where none is configured or the record has none. */
    sequence?: number | string;
    color?: string;
    /** Position in the dataset, which orders stops that share a sequence value or have none. */
    index: number;
}

/** Reads one record's pin, or `undefined` when the record cannot be placed at all. */
const getLocation = (record: IRecord, options: IMapPinOptions): IMapLocation | undefined => {
    const { attributes, fallbackCoordinates, getAppearance } = options;
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
    const pin = getAppearance?.(record);
    return {
        id,
        latitude,
        longitude,
        label: typeof name === 'string' ? name : undefined,
        //an appearance that changes nothing is dropped, so it does not weigh on every location object
        ...(isEmptyPinAppearance(pin) ? {} : { pin })
    };
};

/** Reads an attribute as text, treating an empty value as no value at all. */
const getText = (record: IRecord, path?: string): string | undefined => {
    if (!path) {
        return undefined;
    }
    const value = getRecordValue(record, path);
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    return `${value}`;
};

/** Reads the value a route orders its stops by, as a number where the value parses as one, else as text. */
const getSequence = (record: IRecord, path?: string): number | string | undefined => {
    const text = getText(record, path);
    if (text === undefined) {
        return undefined;
    }
    const numeric = Number(text);
    return Number.isFinite(numeric) ? numeric : text;
};

/**
 * Orders the stops of one route. Stops with a sequence come first, in that order; numbers sort as numbers
 * so `10` follows `9`. Anything without one keeps its dataset position at the end, which is what an
 * unconfigured route already did.
 */
const orderStops = (stops: IRouteStop[]): IRouteStop[] => [...stops].sort((left, right) => {
    if (left.sequence === undefined && right.sequence === undefined) {
        return left.index - right.index;
    }
    if (left.sequence === undefined) {
        return 1;
    }
    if (right.sequence === undefined) {
        return -1;
    }
    if (typeof left.sequence === 'number' && typeof right.sequence === 'number') {
        return left.sequence - right.sequence || left.index - right.index;
    }
    return `${left.sequence}`.localeCompare(`${right.sequence}`) || left.index - right.index;
});

/**
 * Reads the pins off the loaded records: locations in dataset order, routes of two pins or more, and the
 * records left unplaced.
 */
export const getMapPins = (records: IRecord[], options: IMapPinOptions): IMapPins => {
    const { attributes } = options;
    const locations: IMapLocation[] = [];
    const unplacedRecords: IRecord[] = [];
    //a Map, not an object - object keys that look like integers would reorder the routes
    const routeStops = new Map<string, IRouteStop[]>();

    records.forEach((record, index) => {
        try {
            const location = getLocation(record, options);
            if (!location) {
                unplacedRecords.push(record);
                return;
            }
            locations.push(location);
            const routeId = getText(record, attributes.route);
            if (!routeId) {
                return;
            }
            const stop: IRouteStop = {
                location,
                sequence: getSequence(record, attributes.routeSequence),
                color: getText(record, attributes.routeColor),
                index
            };
            const stops = routeStops.get(routeId);
            if (stops) {
                stops.push(stop);
                return;
            }
            routeStops.set(routeId, [stop]);
        } catch (error) {
            console.warn(`Map: failed to read the location of the record on index ${index}:`, error);
        }
    });

    return {
        locations,
        unplacedRecords,
        //a route needs at least two pins to be drawable
        routes: [...routeStops]
            .filter(([, stops]) => stops.length > 1)
            .map(([id, stops]) => {
                const ordered = orderStops(stops);
                return {
                    id,
                    locations: ordered.map((stop) => stop.location),
                    color: ordered.find((stop) => stop.color)?.color
                };
            })
    };
};
