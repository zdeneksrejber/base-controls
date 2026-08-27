import { APIProvider, ColorScheme, Map as GoogleMap, MapCameraChangedEvent, Marker, Polyline, useMap } from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useMemo } from 'react';
import { IMapProvider, IMapProviderProps } from '../IMapProvider';
import { ROUTE_STROKE_WEIGHT, useMapPinSelection } from '../pinStyle';
import { IMapVendor } from '../vendors';
import { IMapViewport } from '../../viewport';
import { getGoogleMapsProviderStyles } from './styles';

export interface IGoogleMapsConfig {
    apiKey: string;
}

const ROUTE_STROKE_OPACITY = 0.9;

const ApplyViewport = (props: { viewport: IMapViewport }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) {
            return;
        }
        const { bounds, center, zoom, padding } = props.viewport;
        try {
            if (bounds) {
                map.fitBounds(bounds, padding);
                return;
            }
            map.setCenter({ lat: center.latitude, lng: center.longitude });
            map.setZoom(zoom);
        } catch (error) {
            console.warn('GoogleMapsProvider: failed to apply the requested viewport:', error);
        }
    }, [map, props.viewport]);

    return null;
};

const GoogleMapsMap = (props: IMapProviderProps & IGoogleMapsConfig) => {
    const { apiKey, locations, routes, viewport, selectedLocationIds, theme, onLocationClick, onViewportChange } = props;
    const styles = useMemo(() => getGoogleMapsProviderStyles(), []);
    const selection = useMapPinSelection(selectedLocationIds);

    const onCameraChanged = useCallback((event: MapCameraChangedEvent) => {
        onViewportChange({
            center: { latitude: event.detail.center.lat, longitude: event.detail.center.lng },
            zoom: event.detail.zoom,
            bounds: event.detail.bounds,
            padding: viewport.padding
        });
    }, [onViewportChange, viewport.padding]);

    return (
        <APIProvider apiKey={apiKey}>
            <div className={styles.container}>
                <GoogleMap
                    defaultCenter={{ lat: viewport.center.latitude, lng: viewport.center.longitude }}
                    defaultZoom={viewport.zoom}
                    colorScheme={theme.isInverted ? ColorScheme.DARK : ColorScheme.LIGHT}
                    disableDefaultUI
                    onCameraChanged={onCameraChanged}
                    className={styles.map}>
                    <ApplyViewport viewport={viewport} />
                    {routes.map((route) => (
                        <Polyline
                            key={route.id}
                            path={route.locations.map((location) => ({ lat: location.latitude, lng: location.longitude }))}
                            strokeColor={theme.palette.themePrimary}
                            strokeOpacity={ROUTE_STROKE_OPACITY}
                            strokeWeight={ROUTE_STROKE_WEIGHT} />
                    ))}
                    {locations.map((location) => (
                        <Marker
                            key={location.id}
                            position={{ lat: location.latitude, lng: location.longitude }}
                            title={location.label}
                            opacity={selection.getOpacity(location)}
                            zIndex={selection.isSelected(location) ? 1 : undefined}
                            onClick={() => onLocationClick(location)} />
                    ))}
                </GoogleMap>
            </div>
        </APIProvider>
    );
};

export const createGoogleMapsProvider = (config: IGoogleMapsConfig): IMapProvider => {
    return (props: IMapProviderProps) => <GoogleMapsMap {...props} apiKey={config.apiKey} />;
};

/**
 * Google Maps as a vendor the control configures itself, from the `GoogleApiKey` parameter. Pass it through
 * `onGetMapVendors` and it behaves exactly like a built-in vendor.
 *
 * Registering it is the host's job because importing this module is what pulls `@vis.gl/react-google-maps`,
 * an optional peer dependency, into the build. Spread it to adjust: `{ ...googleMapsVendor, label: 'Maps' }`.
 */
export const googleMapsVendor: IMapVendor = {
    id: 'google',
    label: 'Google Maps',
    apiKeyParameterName: 'GoogleApiKey',
    createProvider: (apiKey) => createGoogleMapsProvider({ apiKey })
};
