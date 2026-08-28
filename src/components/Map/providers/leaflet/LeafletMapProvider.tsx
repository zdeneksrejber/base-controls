import L from 'leaflet';
import { ReactNode, useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { IMapProvider, IMapProviderProps } from '../IMapProvider';
import { ROUTE_STROKE_WEIGHT, useMapPinSelection } from '../pinStyle';
import { IMapViewport } from '../../viewport';
import { getLeafletMapProviderStyles } from './styles';
import 'leaflet/dist/leaflet.css';

export interface ILeafletMapConfig {
    /** Tile template the map renders. Defaults to the public OpenStreetMap tiles, which have a usage policy. */
    tileLayerUrl?: string;
    /** Attribution shown in the corner. Rendered as HTML, so it can carry the links a licence asks for. */
    attribution?: string;
    /** Lowest zoom level the tile service serves. Defaults to the Leaflet default. */
    minZoom?: number;
    /** Highest zoom the service serves. Leaflet stops at 18, so deeper services must say so or go blank. */
    maxZoom?: number;
    /** Whether a dark theme CSS inverts the tiles. Defaults to `true`; set `false` for a real dark style. */
    invertTilesInDarkTheme?: boolean;
    /** Chrome rendered over the map, for what a licence mandates and the attribution line cannot carry. */
    overlay?: ReactNode;
}

/** Builds the config from what the control handed the provider, for tiles that depend on it - a dark style, say. */
export type ILeafletMapConfigResolver = (props: IMapProviderProps) => ILeafletMapConfig;

const DEFAULT_TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const PIN_SIZE: L.PointExpression = [24, 32];
const PIN_ANCHOR: L.PointExpression = [12, 32];
const PIN_POPUP_ANCHOR: L.PointExpression = [0, -30];

//inline, so the provider needs no image assets and can take its color from the theme
const getPinIcon = (color: string) => new L.DivIcon({
    className: '',
    iconSize: PIN_SIZE,
    iconAnchor: PIN_ANCHOR,
    popupAnchor: PIN_POPUP_ANCHOR,
    html: `<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0a12 12 0 0 0-12 12c0 8.5 12 20 12 20s12-11.5 12-20A12 12 0 0 0 12 0z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
        <circle cx="12" cy="12" r="4.5" fill="#ffffff" />
    </svg>`
});

const toLeafletBounds = (bounds: Required<IMapViewport>['bounds']) =>
    L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]);

const ApplyViewport = (props: Pick<IMapProviderProps, 'viewport'>) => {
    const map = useMap();

    useEffect(() => {
        const { bounds, center, zoom, padding } = props.viewport;
        try {
            //coordinates come off the dataset unvalidated, so a malformed one must not throw out of the effect
            if (bounds) {
                map.fitBounds(toLeafletBounds(bounds), { padding: [padding, padding] });
                return;
            }
            map.setView([center.latitude, center.longitude], zoom);
        } catch (error) {
            console.warn('LeafletMapProvider: failed to apply the requested viewport:', error);
        }
    }, [map, props.viewport]);

    return null;
};

const ReportViewport = (props: Pick<IMapProviderProps, 'viewport' | 'onViewportChange'>) => {
    const report = (map: L.Map) => {
        const center = map.getCenter();
        const bounds = map.getBounds();
        props.onViewportChange({
            center: { latitude: center.lat, longitude: center.lng },
            zoom: map.getZoom(),
            bounds: {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest()
            },
            //never reported by the map itself, so it is threaded through from what the control asked for
            padding: props.viewport.padding
        });
    };

    useMapEvents({
        moveend: (event) => report(event.target),
        zoomend: (event) => report(event.target)
    });

    return null;
};

/**
 * The Leaflet renderer behind every tile based provider here, so a provider for a raster tile service is only
 * a tile url and whatever chrome its licence asks for.
 */
export const LeafletMap = (props: IMapProviderProps & ILeafletMapConfig) => {
    const { locations, routes, viewport, selectedLocationIds, theme, onLocationClick, onViewportChange } = props;
    const tileLayerUrl = props.tileLayerUrl ?? DEFAULT_TILE_LAYER_URL;
    const attribution = props.attribution ?? DEFAULT_ATTRIBUTION;
    const invertTiles = !!theme.isInverted && (props.invertTilesInDarkTheme ?? true);
    const styles = useMemo(() => getLeafletMapProviderStyles(invertTiles), [invertTiles]);
    const icon = useMemo(() => getPinIcon(theme.palette.themePrimary), [theme.palette.themePrimary]);
    const selection = useMapPinSelection(selectedLocationIds);
    //keyed per location, so a selection or viewport re-render does not hand react-leaflet a new identity to rebind on
    const markerEventHandlers = useMemo(() => {
        const handlers = new Map<string, L.LeafletEventHandlerFnMap>();
        locations.forEach((location) => handlers.set(location.id, { click: () => onLocationClick(location) }));
        return handlers;
    }, [locations, onLocationClick]);

    return (
        <div className={styles.container}>
            <MapContainer
                center={[viewport.center.latitude, viewport.center.longitude]}
                zoom={viewport.zoom}
                className={styles.map}>
                <TileLayer
                    //react-leaflet 3 only forwards opacity and z-index to an existing layer, so a new url needs a fresh one
                    key={`${tileLayerUrl}|${attribution}`}
                    attribution={attribution}
                    url={tileLayerUrl}
                    minZoom={props.minZoom}
                    maxZoom={props.maxZoom} />
                <ApplyViewport viewport={viewport} />
                <ReportViewport viewport={viewport} onViewportChange={onViewportChange} />
                {routes.map((route) => (
                    <Polyline
                        key={route.id}
                        positions={route.locations.map((location) => [location.latitude, location.longitude])}
                        color={theme.palette.themePrimary}
                        weight={ROUTE_STROKE_WEIGHT} />
                ))}
                {locations.map((location) => (
                    <Marker
                        key={location.id}
                        position={[location.latitude, location.longitude]}
                        icon={icon}
                        opacity={selection.getOpacity(location)}
                        eventHandlers={markerEventHandlers.get(location.id)}>
                        {location.label && <Popup>{location.label}</Popup>}
                    </Marker>
                ))}
            </MapContainer>
            {props.overlay}
        </div>
    );
};

/**
 * Provider backed by Leaflet and, by default, the public OpenStreetMap tiles. Pass a resolver instead of a
 * config for a service whose tiles depend on what the control hands the provider.
 */
export const createLeafletMapProvider = (config?: ILeafletMapConfig | ILeafletMapConfigResolver): IMapProvider => {
    return (props: IMapProviderProps) =>
        <LeafletMap {...props} {...(typeof config === 'function' ? config(props) : config)} />;
};
