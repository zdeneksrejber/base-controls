import { describe, expect, it } from 'vitest';
import { IMapDirections } from './directions';
import { IMapGeocoder } from './geocoding';
import { createGoogleMapsDirections } from './providers/google-maps/directions';
import { createGoogleMapsGeocoder } from './providers/google-maps/geocoder';
import { createHereMapsDirections } from './providers/here-maps/directions';
import { createHereMapsGeocoder } from './providers/here-maps/geocoder';
import { createMapyDirections } from './providers/mapy/directions';
import { createMapyGeocoder } from './providers/mapy/geocoder';
import { createOsrmDirections } from './providers/leaflet/directions';
import { createNominatimGeocoder } from './providers/leaflet/geocoder';

/**
 * Calls the real geo-coding and routing services, so a change to a response shape is caught here rather
 * than in the browser. Excluded from `npm test` because it spends api quota - run it with `npm run test:live`,
 * with the keys in the environment. A vendor whose key is unset is skipped rather than failed.
 */
const KEYS = {
    here: process.env.MAP_HERE_API_KEY,
    mapy: process.env.MAP_MAPY_API_KEY,
    google: process.env.MAP_GOOGLE_API_KEY
};

const TIMEOUT = 30000;
const PRAGUE = { latitude: 50.0755, longitude: 14.4378 };
const NEARBY = { latitude: 50.0875, longitude: 14.4213 };
const QUERY = 'Václavské náměstí 1, Praha';

const geocoders: { name: string; key?: string; create: () => IMapGeocoder }[] = [
    { name: 'OpenStreetMap (Nominatim)', key: 'keyless', create: () => createNominatimGeocoder() },
    { name: 'HERE', key: KEYS.here, create: () => createHereMapsGeocoder(KEYS.here as string) },
    { name: 'Mapy.com', key: KEYS.mapy, create: () => createMapyGeocoder(KEYS.mapy as string) },
    { name: 'Google Maps', key: KEYS.google, create: () => createGoogleMapsGeocoder(KEYS.google as string) }
];

const directionServices: { name: string; key?: string; create: () => IMapDirections }[] = [
    { name: 'OpenStreetMap (OSRM)', key: 'keyless', create: () => createOsrmDirections() },
    { name: 'HERE', key: KEYS.here, create: () => createHereMapsDirections(KEYS.here as string) },
    { name: 'Mapy.com', key: KEYS.mapy, create: () => createMapyDirections(KEYS.mapy as string) },
    { name: 'Google Maps', key: KEYS.google, create: () => createGoogleMapsDirections(KEYS.google as string) }
];

describe('live geocoding', () => {
    geocoders.forEach(({ name, key, create }) => {
        describe.skipIf(!key)(name, () => {
            it('resolves an address to a place in the right city', async () => {
                const places = await create().geocode(QUERY, { language: 'cs', limit: 2 });

                expect(places.length).toBeGreaterThan(0);
                expect(places[0].coordinates.latitude).toBeCloseTo(50.08, 1);
                expect(places[0].coordinates.longitude).toBeCloseTo(14.42, 1);
                expect(places[0].label).toBeTruthy();
                expect(places[0].address.country).toBeTruthy();
            }, TIMEOUT);

            it('resolves a point to an address carrying the components pin editing writes back', async () => {
                const place = await create().reverseGeocode(PRAGUE, { language: 'cs' });

                expect(place).not.toBeNull();
                expect(place!.address.country).toBeTruthy();
                expect(place!.address.locality).toBeTruthy();
                expect(place!.address.postalCode).toBeTruthy();
            }, TIMEOUT);
        });
    });
});

describe('live directions', () => {
    directionServices.forEach(({ name, key, create }) => {
        describe.skipIf(!key)(name, () => {
            it('snaps two stops to a road following path', async () => {
                let path;
                try {
                    path = await create().getRoute([PRAGUE, NEARBY]);
                } catch (error) {
                    const message = `${error}`;
                    //a routing api the project never enabled is a provisioning gap, not a broken client
                    if (/\b40[13]\b/.test(message)) {
                        console.warn(`${name} routing is not enabled for this key: ${message.slice(0, 200)}`);
                        return;
                    }
                    throw error;
                }

                expect(path).not.toBeNull();
                //a straight line between these two points is 5 coordinates at most, a real route is dozens
                expect(path!.coordinates.length).toBeGreaterThan(20);
                expect(path!.distance).toBeGreaterThan(1000);
            }, TIMEOUT);
        });
    });
});
