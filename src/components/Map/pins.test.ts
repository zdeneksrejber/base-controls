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
});
