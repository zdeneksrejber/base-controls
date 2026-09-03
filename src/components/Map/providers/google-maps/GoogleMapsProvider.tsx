import { APIProvider, ColorScheme, InfoWindow, Map as GoogleMap, MapCameraChangedEvent, Marker, Polyline, useMap } from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useMemo } from 'react';
import { createGoogleMapsDirectionsService } from './directions';
import { createGoogleMapsGeocoder } from './geocoder';
import { isMapSurfaceClick } from '../mapClick';
import { IMapLocation, IMapProvider, IMapProviderProps } from '../IMapProvider';
import { getClusterPinSize, getClusterPinSvg, getPinSize, getPinSvg, ROUTE_STROKE_WEIGHT, useMapPinSelection } from '../pinStyle';
import { IMapVendor } from '../vendors';
import { IMapViewport } from '../../viewport';
import { getGoogleMapsProviderStyles } from './styles';

/** Widest a card is allowed to be, so it never covers the map it is anchored on. */
const CARD_MAX_WIDTH = 340;

/**
 * Hides the points of interest Google draws of its own accord, so the only pins on the map are the records.
 * This is the one vendor here whose tiles can express it - the raster tile services cannot.
 */
const POI_OFF_STYLES: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }
];

export interface IGoogleMapsConfig {
    apiKey: string;
}

const ApplyViewport = (props: { viewport: IMapViewport }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) {
            return;
        }
        const { bounds, center, zoom, padding } = props.viewport;
        try {
            //coordinates come off the dataset unvalidated, so a malformed one must not throw out of the effect
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
    const {
        apiKey,
        locations,
        routes,
        viewport,
        selectedLocationIds,
        theme,
        openCard,
        isPinDraggable,
        showPointsOfInterest,
        onLocationClick,
        onViewportChange,
        onCloseCard,
        onLocationDragEnd,
        onMapClick
    } = props;
    const styles = useMemo(() => getGoogleMapsProviderStyles(), []);
    const selection = useMapPinSelection(selectedLocationIds);

    const onCameraChanged = useCallback((event: MapCameraChangedEvent) => {
        onViewportChange({
            center: { latitude: event.detail.center.lat, longitude: event.detail.center.lng },
            zoom: event.detail.zoom,
            bounds: event.detail.bounds,
            //never reported by the map itself, so it is threaded through from what the control asked for
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
                    styles={showPointsOfInterest ? undefined : POI_OFF_STYLES}
                    onCameraChanged={onCameraChanged}
                    onClick={onMapClick && ((event) => {
                        const position = event.detail.latLng;
                        if (position && isMapSurfaceClick(event.domEvent?.target)) {
                            onMapClick({ latitude: position.lat, longitude: position.lng });
                        }
                    })}
                    className={styles.map}>
                    <ApplyViewport viewport={viewport} />
                    {openCard &&
                        <InfoWindow
                            key={openCard.locationId}
                            position={{ lat: openCard.coordinates.latitude, lng: openCard.coordinates.longitude }}
                            maxWidth={CARD_MAX_WIDTH}
                            //Google steals focus into the window otherwise, which pulls the page around
                            shouldFocus={false}
                            onCloseClick={onCloseCard}>
                            {openCard.content}
                        </InfoWindow>}
                    {routes.map((route) => (
                        <Polyline
                            key={route.id}
                            path={(route.path ?? route.locations).map((point) => ({ lat: point.latitude, lng: point.longitude }))}
                            strokeColor={route.color ?? theme.palette.themePrimary}
                            strokeWeight={ROUTE_STROKE_WEIGHT} />
                    ))}
                    {locations.map((location) => (
                        <Marker
                            key={location.id}
                            position={{ lat: location.latitude, lng: location.longitude }}
                            title={location.cluster ? `${location.cluster.count}` : location.pin?.title ?? location.label}
                            icon={getPinIcon(location, theme.palette.themePrimary, theme.palette.white)}
                            draggable={isPinDraggable?.(location) ?? false}
                            opacity={selection.getOpacity(location)}
                            zIndex={location.cluster ? 1000 + location.cluster.count : selection.isSelected(location) ? 1 : undefined}
                            onClick={() => onLocationClick(location)}
                            onDragEnd={onLocationDragEnd && ((event) => {
                                const position = event.latLng;
                                if (position) {
                                    onLocationDragEnd(location, { latitude: position.lat(), longitude: position.lng() });
                                }
                            })} />
                    ))}
                </GoogleMap>
            </div>
        </APIProvider>
    );
};

/** Wraps markup as a data url, so a Google marker can draw it without an image asset. */
const toDataUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

/**
 * The icon one pin is drawn with.
 *
 * @param location Pin to draw.
 * @param color Fill colour, normally the host theme's primary.
 * @param textColor Colour of a group pin's count.
 * @returns A Google Maps icon, or `undefined` to keep Google's own default pin.
 */
const getPinIcon = (location: IMapLocation, color: string, textColor: string): google.maps.Icon | undefined => {
    if (location.cluster) {
        const size = getClusterPinSize(location.cluster.count);
        return {
            url: toDataUrl(getClusterPinSvg(location.cluster.count, color, textColor)),
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2)
        };
    }
    if (!location.pin?.color && !location.pin?.url && !location.pin?.svg) {
        return undefined;
    }
    const size = getPinSize(location.pin);
    //an image or custom markup is centred on the position, the shipped shape points at it
    const isCentred = !!(location.pin.url || location.pin.svg);
    return {
        url: location.pin.url ?? toDataUrl(location.pin.svg ?? getPinSvg(location.pin.color as string)),
        scaledSize: new google.maps.Size(size.width, size.height),
        anchor: new google.maps.Point(size.width / 2, isCentred ? size.height / 2 : size.height)
    };
};

export const createGoogleMapsProvider = (config: IGoogleMapsConfig): IMapProvider => {
    return (props: IMapProviderProps) => <GoogleMapsMap {...props} apiKey={config.apiKey} />;
};

/**
 * Google Maps as a vendor the control configures itself, from the `GoogleApiKey` parameter. Registering it is
 * the host's job because importing this module is what pulls the optional `@vis.gl/react-google-maps` peer
 * dependency into the build. Spread it to adjust: `{ ...googleMapsVendor, label: 'Maps' }`.
 */
export const googleMapsVendor: IMapVendor = {
    id: 'google',
    label: 'Google Maps',
    apiKeyParameterName: 'GoogleApiKey',
    createProvider: (apiKey) => createGoogleMapsProvider({ apiKey }),
    createGeocoder: createGoogleMapsGeocoder,
    createDirections: createGoogleMapsDirectionsService
};
