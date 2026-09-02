import { IMapDirections } from '../directions';
import { IMapGeocoder } from '../geocoding';
import { IMapProviderOption } from './IMapProvider';

/**
 * Picks a service off the configured providers, preferring the one drawing the map.
 *
 * Geo-coding, reverse geo-coding and directions are separate capabilities from rendering, and not every
 * vendor offers all of them - so a provider without one borrows from another that is configured rather than
 * turning the feature off. Results then come from a different vendor than the tiles, which is a trade the
 * control makes deliberately: a missing service is more surprising than a slightly different address.
 *
 * @param options Providers the control resolved, in the order they are offered.
 * @param selectedId Id of the provider drawing the map.
 * @param getService Reads the service off one provider.
 * @returns The service to use, or `undefined` when no configured provider offers one.
 */
const getMapService = <TService>(
    options: IMapProviderOption[],
    selectedId: string | undefined,
    getService: (option: IMapProviderOption) => TService | undefined
): TService | undefined => {
    const selected = options.find((option) => option.id === selectedId);
    if (selected) {
        const service = getService(selected);
        if (service) {
            return service;
        }
    }
    return options.map(getService).find((service): service is TService => !!service);
};

/**
 * Picks the geocoding service the control should use.
 *
 * @param options Providers the control resolved.
 * @param selectedId Id of the provider drawing the map.
 * @returns The geocoder, or `undefined` when no configured provider has one.
 */
export const getMapGeocoder = (options: IMapProviderOption[], selectedId?: string): IMapGeocoder | undefined =>
    getMapService(options, selectedId, (option) => option.geocoder);

/**
 * Picks the directions service the control should use.
 *
 * @param options Providers the control resolved.
 * @param selectedId Id of the provider drawing the map.
 * @returns The directions service, or `undefined` when no configured provider has one.
 */
export const getMapDirections = (options: IMapProviderOption[], selectedId?: string): IMapDirections | undefined =>
    getMapService(options, selectedId, (option) => option.directions);
