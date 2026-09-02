import { useCallback, useEffect, useMemo, useState } from "react";
import { IDataProviderEventListeners } from "@talxis/client-libraries";
import { useControl } from "@hooks";
import { useEventEmitter } from "@hooks/useEventEmitter";
import { getClassNames } from "@utils";
import { IMap } from "./interfaces";
import { getDistinctAttributePaths } from "./attributes";
import { useMapClusters } from "./useMapClusters";
import { IMapLocation, IMapProviderProps } from "./providers";
import { EMPTY_MAP_PINS, getMapPins } from "./pins";
import { useMapAttributes } from "./useMapAttributes";
import { useMapProviders } from "./useMapProviders";
import { useMapRecords } from "./useMapRecords";
import { useMapViewport } from "./useMapViewport";
import { mapTranslations } from "./translations";
import { getMapStyles } from "./styles";
import { MapProviderPicker } from "./map-provider-picker";
import { MapStatus } from "./map-status";

export const Map = (props: IMap) => {
    const onOverrideComponentProps = props.onOverrideComponentProps ?? ((providerProps) => providerProps);
    const {
        Dataset: dataset,
        LatitudeAttributeName,
        LongitudeAttributeName,
        RouteAttributeName,
        EnableAttributeLinking,
        PinLoading,
        MaxRecords,
        EnableClustering,
        ClusteringOptions,
        ViewportOptions
    } = props.parameters;
    const { className, labels, theme, onNotifyOutputChanged } = useControl('Map', props, mapTranslations);
    const styles = useMemo(() => getMapStyles(), []);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

    const { options, selectedId, provider: MapProvider, onPickProvider } = useMapProviders({
        parameters: props.parameters,
        onGetMapProviders: props.onGetMapProviders,
        onGetMapVendors: props.onGetMapVendors,
        onPick: (id) => onNotifyOutputChanged({ MapProviderId: id })
    });

    //raw values as the dependency, so a host has to memoize nothing to keep the pins stable
    const latitudeAttribute = LatitudeAttributeName?.raw;
    const longitudeAttribute = LongitudeAttributeName?.raw;
    const routeAttribute = RouteAttributeName?.raw;

    const attributePaths = useMemo(
        () => getDistinctAttributePaths([latitudeAttribute, longitudeAttribute, routeAttribute]),
        [latitudeAttribute, longitudeAttribute, routeAttribute]
    );
    useMapAttributes({ dataset, paths: attributePaths, enabled: EnableAttributeLinking?.raw !== false });

    const { records, isLoading, loadedCount, isTruncated } = useMapRecords({
        dataset,
        loading: PinLoading?.raw === 'all' ? 'all' : 'page',
        maxRecords: MaxRecords?.raw ?? undefined
    });

    const pins = useMemo(() => {
        if (!latitudeAttribute || !longitudeAttribute) {
            return EMPTY_MAP_PINS;
        }
        return getMapPins(records, {
            latitude: latitudeAttribute,
            longitude: longitudeAttribute,
            route: routeAttribute ?? undefined
        });
    }, [records, latitudeAttribute, longitudeAttribute, routeAttribute]);

    const { viewport, visibleViewport, onViewportChange, onFocusViewport } = useMapViewport({
        locations: pins.locations,
        provider: MapProvider,
        options: ViewportOptions?.raw,
        onResolveFallbackLocation: props.onResolveFallbackLocation,
        onChange: (changedViewport) => onNotifyOutputChanged({ Viewport: changedViewport })
    });

    const drawnLocations = useMapClusters({
        locations: pins.locations,
        enabled: EnableClustering?.raw !== false,
        visibleViewport,
        options: ClusteringOptions?.raw
    });

    useEffect(() => {
        setSelectedLocationIds(dataset?.getSelectedRecordIds() ?? []);
    }, [dataset, records]);

    useEventEmitter<IDataProviderEventListeners>(dataset, 'onRecordsSelected', (ids: string[]) => setSelectedLocationIds(ids ?? []));

    const onLocationClick = useCallback((location: IMapLocation) => {
        //a group has no record to select, so activating one zooms to where it comes apart instead
        if (location.cluster) {
            onFocusViewport({
                center: { latitude: location.latitude, longitude: location.longitude },
                zoom: location.cluster.expansionZoom,
                padding: viewport.padding
            });
            return;
        }
        dataset?.setSelectedRecordIds([location.id]);
    }, [dataset, onFocusViewport, viewport.padding]);

    const providerProps = useMemo<IMapProviderProps>(() => ({
        locations: drawnLocations,
        routes: pins.routes,
        viewport,
        selectedLocationIds,
        context: props.context,
        theme,
        labels,
        onLocationClick,
        onViewportChange
    }), [drawnLocations, pins.routes, viewport, selectedLocationIds, props.context, theme, labels, onLocationClick, onViewportChange]);

    const status = isLoading
        ? { message: labels.loadingPins({ count: `${loadedCount}` }), isBusy: true }
        : isTruncated
            ? { message: labels.pinsTruncated({ count: `${records.length}` }), isWarning: true }
            : {};

    return (
        <div className={getClassNames([className, styles.root])}>
            <MapProvider {...onOverrideComponentProps(providerProps)} />
            <MapStatus {...status} theme={theme} />
            {options.length > 1 &&
                <MapProviderPicker
                    options={options}
                    selectedId={selectedId}
                    label={labels.mapProvider()}
                    theme={theme}
                    onChange={onPickProvider} />}
        </div>
    );
};
