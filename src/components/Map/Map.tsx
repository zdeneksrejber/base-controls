import { useCallback, useEffect, useMemo, useState } from "react";
import { IDataProviderEventListeners } from "@talxis/client-libraries";
import { useControl } from "@hooks";
import { useEventEmitter } from "@hooks/useEventEmitter";
import { getClassNames } from "@utils";
import { IMap } from "./interfaces";
import { IMapLocation, IMapProviderProps } from "./providers";
import { EMPTY_MAP_PINS, getMapPins, IMapPins } from "./pins";
import { useMapProviders } from "./useMapProviders";
import { useMapViewport } from "./useMapViewport";
import { mapTranslations } from "./translations";
import { getMapStyles } from "./styles";
import { MapProviderPicker } from "./map-provider-picker";

export const Map = (props: IMap) => {
    const onOverrideComponentProps = props.onOverrideComponentProps ?? ((providerProps) => providerProps);
    const {
        Dataset: dataset,
        LatitudeAttributeName,
        LongitudeAttributeName,
        RouteAttributeName,
        ViewportOptions
    } = props.parameters;
    const { className, labels, theme, onNotifyOutputChanged } = useControl('Map', props, mapTranslations);
    const styles = useMemo(() => getMapStyles(), []);
    const [pins, setPins] = useState<IMapPins>(EMPTY_MAP_PINS);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

    const { options, selectedId, provider: MapProvider, onPickProvider } = useMapProviders({
        parameters: props.parameters,
        onGetMapProvider: props.onGetMapProvider,
        onGetMapProviders: props.onGetMapProviders,
        onGetMapVendors: props.onGetMapVendors,
        onPick: (id) => onNotifyOutputChanged({ MapProviderId: id })
    });

    const { viewport, onViewportChange } = useMapViewport({
        locations: pins.locations,
        provider: MapProvider,
        options: ViewportOptions?.raw,
        onResolveFallbackLocation: props.onResolveFallbackLocation,
        onChange: (changedViewport) => onNotifyOutputChanged({ Viewport: changedViewport })
    });

    //raw values as the dependency, so a host has to memoize nothing to keep the pins stable
    const latitudeAttribute = LatitudeAttributeName?.raw;
    const longitudeAttribute = LongitudeAttributeName?.raw;
    const routeAttribute = RouteAttributeName?.raw;

    const loadPins = useCallback(() => {
        if (!dataset || !latitudeAttribute || !longitudeAttribute) {
            setPins(EMPTY_MAP_PINS);
            setSelectedLocationIds([]);
            return;
        }
        setPins(getMapPins(dataset.getRecords(), {
            latitude: latitudeAttribute,
            longitude: longitudeAttribute,
            route: routeAttribute ?? undefined
        }));
        setSelectedLocationIds(dataset.getSelectedRecordIds());
    }, [dataset, latitudeAttribute, longitudeAttribute, routeAttribute]);

    //loading is the DatasetControl's job, this only syncs the already loaded records into local state
    useEffect(() => {
        loadPins();
    }, [loadPins]);

    useEventEmitter<IDataProviderEventListeners>(dataset, 'onNewDataLoaded', loadPins);
    useEventEmitter<IDataProviderEventListeners>(dataset, 'onRecordsSelected', (selectedRecordIds: string[]) => setSelectedLocationIds(selectedRecordIds ?? []));

    const onLocationClick = useCallback((location: IMapLocation) => {
        dataset?.setSelectedRecordIds([location.id]);
    }, [dataset]);

    const providerProps = useMemo<IMapProviderProps>(() => ({
        locations: pins.locations,
        routes: pins.routes,
        viewport,
        selectedLocationIds,
        context: props.context,
        theme,
        labels,
        onLocationClick,
        onViewportChange
    }), [pins, viewport, selectedLocationIds, props.context, theme, labels, onLocationClick, onViewportChange]);

    return (
        <div className={getClassNames([className, styles.root])}>
            <MapProvider {...onOverrideComponentProps(providerProps)} />
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
