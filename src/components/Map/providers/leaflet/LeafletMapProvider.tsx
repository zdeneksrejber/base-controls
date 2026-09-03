import L from 'leaflet';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { IMapLocation, IMapProvider, IMapProviderProps } from '../IMapProvider';
import {
    getClusterPinSize,
    getClusterPinSvg,
    getPinImageMarkup,
    getPinMarkup,
    getPinSize,
    PIN_HEIGHT,
    PIN_WIDTH,
    ROUTE_STROKE_WEIGHT,
    useMapPinSelection
} from '../pinStyle';
import { isFiniteMapViewport, IMapViewport } from '../../viewport';
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

/** Widest a card is allowed to be, so it never covers the map it is anchored on. */
const CARD_MAX_WIDTH = 340;

const DEFAULT_TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * The icon one pin is drawn with.
 *
 * Everything is a `DivIcon`, image included, so the provider needs no image assets of its own and a custom
 * appearance is drawn exactly the same way as the shipped one.
 *
 * @param location Pin to draw.
 * @param defaultColor Colour the shipped pin takes.
 * @returns The Leaflet icon.
 */
const getPinIcon = (location: IMapLocation, defaultColor: string) => {
    const size = getPinSize(location.pin);
    const markup = getPinMarkup(location.pin, defaultColor);
    return new L.DivIcon({
        className: '',
        iconSize: [size.width, size.height],
        //the shipped shape points at its position, anything else is centred on it
        iconAnchor: location.pin?.svg || location.pin?.url ? [size.width / 2, size.height / 2] : [size.width / 2, size.height],
        popupAnchor: [0, -(size.height / 2)],
        html: markup ?? getPinImageMarkup(location.pin!.url as string, size)
    });
};

/** A pin standing for a group, anchored at its centre because a circle has no tip to point with. */
const getClusterIcon = (count: number, color: string, textColor: string) => {
    const size = getClusterPinSize(count);
    return new L.DivIcon({
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2)],
        html: getClusterPinSvg(count, color, textColor)
    });
};

const toLeafletBounds = (bounds: Required<IMapViewport>['bounds']) =>
    L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]);

/**
 * Keeps Leaflet's cached container size in step with the element.
 *
 * Leaflet measures its container once, at creation, and afterwards only when the window resizes. A map built
 * inside an element the browser has not laid out yet - a hidden tab, a docs page, a control that mounts
 * before its host sizes it - therefore caches a zero size, and every coordinate it computes from that is
 * `NaN` for the rest of its life. Observing the element and re-measuring is what makes the map recoverable.
 *
 * @param map Map to keep measured.
 * @returns Whether the map currently has a usable size, so the caller can hold off on applying a viewport.
 */
const useMeasuredMap = (map: L.Map): boolean => {
    const hasUsableSize = () => {
        const size = map.getSize();
        return size.x > 0 && size.y > 0;
    };
    const [hasSize, setHasSize] = useState(hasUsableSize);

    useEffect(() => {
        const measure = () => {
            map.invalidateSize({ animate: false });
            setHasSize(hasUsableSize());
        };
        const observer = new ResizeObserver(measure);
        observer.observe(map.getContainer());
        measure();
        return () => observer.disconnect();
        //hasUsableSize closes over map alone, and re-running on every render would thrash the observer
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]);

    return hasSize;
};

const ApplyViewport = (props: Pick<IMapProviderProps, 'viewport'>) => {
    const map = useMap();
    const hasSize = useMeasuredMap(map);

    useEffect(() => {
        const { bounds, center, zoom, padding } = props.viewport;
        //fitting bounds inside a map of no width divides by zero, which poisons the map with NaN for good
        if (!hasSize || !isFiniteMapViewport(props.viewport)) {
            return;
        }
        try {
            if (bounds) {
                map.fitBounds(toLeafletBounds(bounds), { padding: [padding, padding] });
                return;
            }
            map.setView([center.latitude, center.longitude], zoom);
        } catch (error) {
            console.warn('LeafletMapProvider: failed to apply the requested viewport:', error);
        }
    }, [map, props.viewport, hasSize]);

    return null;
};

const ReportViewport = (props: Pick<IMapProviderProps, 'viewport' | 'onViewportChange'>) => {
    const report = (map: L.Map) => {
        let reported: IMapViewport;
        try {
            const center = map.getCenter();
            const bounds = map.getBounds();
            reported = {
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
            };
        } catch (error) {
            //a map the browser has not laid out throws instead of answering, and has nothing to report anyway
            return;
        }
        //the same map can also answer with NaN, which must not reach the output or the next provider
        if (isFiniteMapViewport(reported)) {
            props.onViewportChange(reported);
        }
    };

    useMapEvents({
        moveend: (event) => report(event.target),
        zoomend: (event) => report(event.target)
    });

    return null;
};

const ReportMapClick = (props: { onMapClick: (coordinates: { latitude: number; longitude: number }) => void }) => {
    useMapEvents({
        click: (event) => props.onMapClick({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    });

    return null;
};

/**
 * The Leaflet renderer behind every tile based provider here, so a provider for a raster tile service is only
 * a tile url and whatever chrome its licence asks for.
 */
export const LeafletMap = (props: IMapProviderProps & ILeafletMapConfig) => {
    const {
        locations,
        routes,
        viewport,
        selectedLocationIds,
        theme,
        openCard,
        isPinDraggable,
        onLocationClick,
        onViewportChange,
        onCloseCard,
        onLocationDragEnd,
        onMapClick
    } = props;
    const tileLayerUrl = props.tileLayerUrl ?? DEFAULT_TILE_LAYER_URL;
    const attribution = props.attribution ?? DEFAULT_ATTRIBUTION;
    const invertTiles = !!theme.isInverted && (props.invertTilesInDarkTheme ?? true);
    const styles = useMemo(() => getLeafletMapProviderStyles(invertTiles), [invertTiles]);
    //icons are cached per appearance and per group size, so panning does not rebuild one per pin per frame
    const iconCache = useMemo(() => new Map<string, L.DivIcon>(), [theme.palette.themePrimary, theme.palette.white]);
    const getIcon = (location: IMapLocation) => {
        const key = location.cluster
            ? `cluster|${location.cluster.count}`
            : `pin|${location.pin?.color ?? ''}|${location.pin?.url ?? ''}|${location.pin?.svg ?? ''}|${location.pin?.width ?? ''}x${location.pin?.height ?? ''}`;
        const cached = iconCache.get(key);
        if (cached) {
            return cached;
        }
        const built = location.cluster
            ? getClusterIcon(location.cluster.count, theme.palette.themePrimary, theme.palette.white)
            : getPinIcon(location, theme.palette.themePrimary);
        iconCache.set(key, built);
        return built;
    };
    const selection = useMapPinSelection(selectedLocationIds);
    //keyed per location, so a selection or viewport re-render does not hand react-leaflet a new identity to rebind on
    const markerEventHandlers = useMemo(() => {
        const handlers = new Map<string, L.LeafletEventHandlerFnMap>();
        locations.forEach((location) => handlers.set(location.id, {
            click: () => onLocationClick(location),
            dragend: (event) => {
                const { lat, lng } = (event.target as L.Marker).getLatLng();
                onLocationDragEnd?.(location, { latitude: lat, longitude: lng });
            }
        }));
        return handlers;
    }, [locations, onLocationClick, onLocationDragEnd]);

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
                {onMapClick && <ReportMapClick onMapClick={onMapClick} />}
                {openCard &&
                    <Popup
                        //a popup with no parent marker opens as it mounts, and closes whichever was open
                        key={openCard.locationId}
                        position={[openCard.coordinates.latitude, openCard.coordinates.longitude]}
                        maxWidth={CARD_MAX_WIDTH}
                        onClose={onCloseCard}>
                        {openCard.content}
                    </Popup>}
                {routes.map((route) => (
                    <Polyline
                        key={route.id}
                        positions={route.locations.map((location) => [location.latitude, location.longitude])}
                        color={theme.palette.themePrimary}
                        weight={ROUTE_STROKE_WEIGHT} />
                ))}
                {/* the label lives on the marker's tooltip; the card the control opens is the popup below */}
                {locations.map((location) => (
                    <Marker
                        key={location.id}
                        position={[location.latitude, location.longitude]}
                        icon={getIcon(location)}
                        title={location.pin?.title ?? location.label}
                        draggable={isPinDraggable?.(location) ?? false}
                        opacity={selection.getOpacity(location)}
                        eventHandlers={markerEventHandlers.get(location.id)} />
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
