import { describe, expect, it, vi } from 'vitest';
import { getMapPins } from './pins';
import { createFakeRecord } from './testing/records';

const attributes = { latitude: 'lat', longitude: 'lng' };
const options = { attributes };

describe('getMapPins', () => {
    it('reads a pin per record, in dataset order', () => {
        const records = [
            createFakeRecord({ id: 'a', name: 'Prague', rawData: { lat: 50.08, lng: 14.43 } }),
            createFakeRecord({ id: 'b', name: 'Brno', rawData: { lat: 49.19, lng: 16.61 } })
        ];
        expect(getMapPins(records, options).locations).toEqual([
            { id: 'a', latitude: 50.08, longitude: 14.43, label: 'Prague' },
            { id: 'b', latitude: 49.19, longitude: 16.61, label: 'Brno' }
        ]);
    });

    it('reads coordinates held on a related record through dot notation', () => {
        const records = [
            createFakeRecord({
                id: 'a',
                rawData: { 'cds_addressid.cds_latitude': 50.08, 'cds_addressid.cds_longitude': 14.43 },
                columns: []
            })
        ];
        const pins = getMapPins(records, {
            attributes: {
                latitude: 'cds_addressid.cds_latitude',
                longitude: 'cds_addressid.cds_longitude'
            }
        });
        expect(pins.locations).toEqual([{ id: 'a', latitude: 50.08, longitude: 14.43, label: undefined }]);
    });

    it('reports the records it could not place, so the address fallback can try them', () => {
        const records = [
            createFakeRecord({ id: 'placed', rawData: { lat: 50.08, lng: 14.43 } }),
            createFakeRecord({ id: 'unplaced', rawData: { lat: null, lng: null, address: 'Praha' } })
        ];
        const pins = getMapPins(records, options);

        expect(pins.locations.map((location) => location.id)).toEqual(['placed']);
        expect(pins.unplacedRecords.map((record) => record.getRecordId())).toEqual(['unplaced']);
    });

    it('places a record from coordinates resolved elsewhere when it carries none', () => {
        const records = [createFakeRecord({ id: 'geocoded', rawData: { lat: null, lng: null } })];

        const pins = getMapPins(records, {
            attributes,
            fallbackCoordinates: { geocoded: { latitude: 49.19, longitude: 16.61 } }
        });

        expect(pins.locations).toEqual([{ id: 'geocoded', latitude: 49.19, longitude: 16.61, label: undefined }]);
        expect(pins.unplacedRecords).toEqual([]);
    });

    it('prefers the record own coordinates over ones resolved elsewhere', () => {
        const records = [createFakeRecord({ id: 'a', rawData: { lat: 50.08, lng: 14.43 } })];

        const pins = getMapPins(records, {
            attributes,
            fallbackCoordinates: { a: { latitude: 0, longitude: 0 } }
        });

        expect(pins.locations[0]).toMatchObject({ latitude: 50.08, longitude: 14.43 });
    });

    it('joins a record placed by the fallback into its route', () => {
        const records = [
            createFakeRecord({ id: 'a', rawData: { lat: 1, lng: 1, trip: 'north' } }),
            createFakeRecord({ id: 'b', rawData: { lat: null, lng: null, trip: 'north' } })
        ];

        const routes = getMapPins(records, {
            attributes: { ...attributes, route: 'trip' },
            fallbackCoordinates: { b: { latitude: 2, longitude: 2 } }
        }).routes;

        expect(routes).toHaveLength(1);
        expect(routes[0].locations.map((location) => location.id)).toEqual(['a', 'b']);
    });

    it('skips a record whose coordinates cannot be read', () => {
        const records = [
            createFakeRecord({ id: 'a', rawData: { lat: 50.08, lng: 14.43 } }),
            createFakeRecord({ id: 'b', rawData: { lat: null, lng: 14.43 } }),
            createFakeRecord({ id: 'c', rawData: { lat: 'nowhere', lng: 14.43 } })
        ];
        expect(getMapPins(records, options).locations.map((location) => location.id)).toEqual(['a']);
    });

    it('does not let one unreadable record stop the rest', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const broken = createFakeRecord({ id: 'broken', rawData: { lat: 1, lng: 1 } });
        broken.getRecordId = () => { throw new Error('gone'); };
        const records = [broken, createFakeRecord({ id: 'ok', rawData: { lat: 50.08, lng: 14.43 } })];

        expect(getMapPins(records, options).locations.map((location) => location.id)).toEqual(['ok']);
        expect(warn).toHaveBeenCalledOnce();
    });

    it('groups records sharing a route attribute value, keeping dataset order', () => {
        const records = [
            createFakeRecord({ id: 'a', rawData: { lat: 1, lng: 1, trip: 'north' } }),
            createFakeRecord({ id: 'b', rawData: { lat: 2, lng: 2, trip: 'south' } }),
            createFakeRecord({ id: 'c', rawData: { lat: 3, lng: 3, trip: 'north' } })
        ];
        const routes = getMapPins(records, { attributes: { ...attributes, route: 'trip' } }).routes;
        expect(routes).toHaveLength(1);
        expect(routes[0].id).toBe('north');
        expect(routes[0].locations.map((location) => location.id)).toEqual(['a', 'c']);
    });

    it('drops a route of a single pin and a record with an empty route value', () => {
        const records = [
            createFakeRecord({ id: 'a', rawData: { lat: 1, lng: 1, trip: 'lonely' } }),
            createFakeRecord({ id: 'b', rawData: { lat: 2, lng: 2, trip: '' } })
        ];
        expect(getMapPins(records, { attributes: { ...attributes, route: 'trip' } }).routes).toEqual([]);
    });

    it('draws no routes when no route attribute is configured', () => {
        const records = [
            createFakeRecord({ id: 'a', rawData: { lat: 1, lng: 1, trip: 'north' } }),
            createFakeRecord({ id: 'b', rawData: { lat: 2, lng: 2, trip: 'north' } })
        ];
        expect(getMapPins(records, options).routes).toEqual([]);
    });

    it('orders a route by its sequence attribute rather than by dataset order', () => {
        const records = [
            createFakeRecord({ id: 'c', rawData: { lat: 3, lng: 3, trip: 'north', stop: 3 } }),
            createFakeRecord({ id: 'a', rawData: { lat: 1, lng: 1, trip: 'north', stop: 1 } }),
            createFakeRecord({ id: 'b', rawData: { lat: 2, lng: 2, trip: 'north', stop: 2 } })
        ];

        const [route] = getMapPins(records, {
            attributes: { ...attributes, route: 'trip', routeSequence: 'stop' }
        }).routes;

        expect(route.locations.map((location) => location.id)).toEqual(['a', 'b', 'c']);
    });

    it('sorts a numeric sequence as numbers, so ten follows nine', () => {
        const records = [9, 10, 2].map((stop) => createFakeRecord({
            id: `s${stop}`,
            rawData: { lat: stop, lng: stop, trip: 'north', stop }
        }));

        const [route] = getMapPins(records, {
            attributes: { ...attributes, route: 'trip', routeSequence: 'stop' }
        }).routes;

        expect(route.locations.map((location) => location.id)).toEqual(['s2', 's9', 's10']);
    });

    it('puts the stops with no sequence last, keeping their dataset order', () => {
        const records = [
            createFakeRecord({ id: 'none1', rawData: { lat: 1, lng: 1, trip: 'north' } }),
            createFakeRecord({ id: 'second', rawData: { lat: 2, lng: 2, trip: 'north', stop: 2 } }),
            createFakeRecord({ id: 'none2', rawData: { lat: 3, lng: 3, trip: 'north' } }),
            createFakeRecord({ id: 'first', rawData: { lat: 4, lng: 4, trip: 'north', stop: 1 } })
        ];

        const [route] = getMapPins(records, {
            attributes: { ...attributes, route: 'trip', routeSequence: 'stop' }
        }).routes;

        expect(route.locations.map((location) => location.id)).toEqual(['first', 'second', 'none1', 'none2']);
    });

    it('colours a route from the first stop that names one', () => {
        const records = [
            createFakeRecord({ id: 'a', rawData: { lat: 1, lng: 1, trip: 'north' } }),
            createFakeRecord({ id: 'b', rawData: { lat: 2, lng: 2, trip: 'north', shade: '#c50f1f' } })
        ];

        const [route] = getMapPins(records, {
            attributes: { ...attributes, route: 'trip', routeColor: 'shade' }
        }).routes;

        expect(route.color).toBe('#c50f1f');
    });

    it('leaves a route uncoloured when no stop names one', () => {
        const records = [
            createFakeRecord({ id: 'a', rawData: { lat: 1, lng: 1, trip: 'north' } }),
            createFakeRecord({ id: 'b', rawData: { lat: 2, lng: 2, trip: 'north' } })
        ];

        const [route] = getMapPins(records, {
            attributes: { ...attributes, route: 'trip', routeColor: 'shade' }
        }).routes;

        expect(route.color).toBeUndefined();
    });

    it('reads a pin appearance for each record', () => {
        const records = [createFakeRecord({ id: 'a', rawData: { lat: 1, lng: 1, kind: 'depot' } })];

        const pins = getMapPins(records, {
            attributes,
            getAppearance: (record) => record.getValue('kind') === 'depot' ? { color: '#c50f1f' } : undefined
        });

        expect(pins.locations[0].pin).toEqual({ color: '#c50f1f' });
    });

    it('leaves an appearance that changes nothing off the location', () => {
        const records = [createFakeRecord({ id: 'a', rawData: { lat: 1, lng: 1 } })];
        const pins = getMapPins(records, { attributes, getAppearance: () => ({}) });
        expect(pins.locations[0]).not.toHaveProperty('pin');
    });
});
