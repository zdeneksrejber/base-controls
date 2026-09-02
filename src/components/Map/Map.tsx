import { useCallback, useEffect, useMemo, useState } from "react";
import { IDataProviderEventListeners, IRecord } from "@talxis/client-libraries";
import { useControl } from "@hooks";
import { useEventEmitter } from "@hooks/useEventEmitter";
import { getClassNames } from "@utils";
import { IMap } from "./interfaces";
import { getDistinctAttributePaths } from "./attributes";
import { getMapLanguageTag } from "./language";
import { getMapPinAppearance, parseMapPinRules } from "./pinAppearance";
import { useMapClientApi } from "./clientApi";
import { getMapWebResourceUrl } from "./webResource";
import { IMapLocation, IMapProviderProps } from "./providers";
import { EMPTY_MAP_PINS, getMapPins, IMapFallbackCoordinates } from "./pins";
import { useGeocodedLocations } from "./useGeocodedLocations";
import { useMapAttributes } from "./useMapAttributes";
import { useMapClusters } from "./useMapClusters";
import { useMapFiltering } from "./useMapFiltering";
import { useMapProviders } from "./useMapProviders";
import { useMapRecords } from "./useMapRecords";
import { useMapSearch } from "./useMapSearch";
import { useMapViewport } from "./useMapViewport";
import { mapTranslations } from "./translations";
import { getMapStyles } from "./styles";
import { MapOverlay } from "./map-overlay";
import { MapFilterPanel } from "./map-filter-panel";
import { MapProviderPicker } from "./map-provider-picker";
import { MapSearchBox } from "./map-search-box";
import { MapStatus } from "./map-status";

/** Zoom the map moves to when a place is picked out of the search suggestions. */
const PLACE_ZOOM = 15;

export const Map = (props: IMap) => {
    const onOverrideComponentProps = props.onOverrideComponentProps ?? ((providerProps) => providerProps);
    const {
        Dataset: dataset,
        LatitudeAttributeName,
        LongitudeAttributeName,
        RouteAttributeName,
        FullAddressAttributeName,
        MaxGeocodingRequests,
        EnableAttributeLinking,
        PinLoading,
        MaxRecords,
        PinIcons,
        ClientApiWebresourceName,
        ClientApiFunctionName,
        EnableClustering,
        ClusteringOptions,
        FilterAttributeNames,
        FilterMode,
        EnableSearch,
        EnableAddressSearch,
        ViewportOptions
    } = props.parameters;
    const { className, labels, theme, onNotifyOutputChanged } = useControl('Map', props, mapTranslations);
    const styles = useMemo(() => getMapStyles(), []);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    const language = getMapLanguageTag(props.context?.userSettings?.languageId);

    const { options, selectedId, provider: MapProvider, geocoder, onPickProvider } = useMapProviders({
        parameters: props.parameters,
        onGetMapProviders: props.onGetMapProviders,
        onGetMapVendors: props.onGetMapVendors,
        onPick: (id) => onNotifyOutputChanged({ MapProviderId: id })
    });

    //raw values as the dependency, so a host has to memoize nothing to keep the pins stable
    const latitudeAttribute = LatitudeAttributeName?.raw;
    const longitudeAttribute = LongitudeAttributeName?.raw;
    const routeAttribute = RouteAttributeName?.raw;
    const addressAttribute = FullAddressAttributeName?.raw;

    const filterAttributes = useMemo(
        () => (FilterAttributeNames?.raw ?? '').split(',').map((name) => name.trim()).filter(Boolean),
        [FilterAttributeNames?.raw]
    );

    const attributePaths = useMemo(
        () => getDistinctAttributePaths([latitudeAttribute, longitudeAttribute, routeAttribute, addressAttribute, ...filterAttributes]),
        [latitudeAttribute, longitudeAttribute, routeAttribute, addressAttribute, filterAttributes]
    );
    useMapAttributes({ dataset, paths: attributePaths, enabled: EnableAttributeLinking?.raw !== false });

    const { records: loadedRecords, isLoading, loadedCount, isTruncated } = useMapRecords({
        dataset,
        loading: PinLoading?.raw === 'all' ? 'all' : 'page',
        maxRecords: MaxRecords?.raw ?? undefined
    });

    const clientApi = useMapClientApi({
        webResourceName: ClientApiWebresourceName?.raw ?? undefined,
        functionName: ClientApiFunctionName?.raw ?? undefined,
        dataset
    });

    const pinRules = useMemo(() => parseMapPinRules(PinIcons?.raw), [PinIcons?.raw]);
    const onResolvePin = props.onResolvePin;
    const clientApiResolvePin = clientApi.resolvePin;
    //code first, then whatever the Client API registered, then the rules a maker typed into the manifest
    const resolvePinAppearance = useCallback((record: IRecord) =>
        onResolvePin?.(record)
        ?? clientApiResolvePin?.(record)
        ?? getMapPinAppearance(record, pinRules, getMapWebResourceUrl),
    [onResolvePin, clientApiResolvePin, pinRules]);

    const filtering = useMapFiltering({
        dataset,
        records: loadedRecords,
        attributes: filterAttributes,
        mode: FilterMode?.raw === 'dataset' ? 'dataset' : 'pins'
    });
    const records = filtering.records;

    //placed first from the record's own coordinates, then again once the address fallback has resolved some
    const readPins = useCallback((fallbackCoordinates?: IMapFallbackCoordinates) => {
        if (!latitudeAttribute || !longitudeAttribute) {
            return EMPTY_MAP_PINS;
        }
        return getMapPins(records, {
            attributes: {
                latitude: latitudeAttribute,
                longitude: longitudeAttribute,
                route: routeAttribute ?? undefined
            },
            fallbackCoordinates,
            getAppearance: resolvePinAppearance
        });
    }, [records, latitudeAttribute, longitudeAttribute, routeAttribute, resolvePinAppearance]);

    const unplacedRecords = useMemo(() => readPins().unplacedRecords, [readPins]);

    const geocoded = useGeocodedLocations({
        records: unplacedRecords,
        addressAttribute: addressAttribute ?? undefined,
        geocoder,
        language,
        maxRequests: MaxGeocodingRequests?.raw ?? undefined
    });

    const pins = useMemo(() => readPins(geocoded.coordinates), [readPins, geocoded.coordinates]);

    const { viewport, visibleViewport, onViewportChange, onFocusViewport } = useMapViewport({
        locations: pins.locations,
        provider: MapProvider,
        options: ViewportOptions?.raw,
        onResolveFallbackLocation: props.onResolveFallbackLocation,
        onChange: (changedViewport) => onNotifyOutputChanged({ Viewport: changedViewport })
    });

    const isSearchEnabled = EnableSearch?.raw === true;
    const search = useMapSearch({
        dataset,
        geocoder,
        enableAddressSearch: isSearchEnabled && EnableAddressSearch?.raw !== false,
        language
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
        : geocoded.isResolving
            ? { message: labels.geocodingAddresses({ count: `${geocoded.pendingCount}` }), isBusy: true }
            : isTruncated
                ? { message: labels.pinsTruncated({ count: `${records.length}` }), isWarning: true }
                : {};

    return (
        <div className={getClassNames([className, styles.root])}>
            <MapProvider {...onOverrideComponentProps(providerProps)} />
            <MapOverlay position='top-left' theme={theme}>
                {isSearchEnabled &&
                    <MapSearchBox
                        query={search.query}
                        suggestions={search.suggestions}
                        isSuggesting={search.isSuggesting}
                        searchedColumnNames={search.quickFindColumns.map((column) => column.displayName ?? column.name)}
                        labels={labels}
                        theme={theme}
                        onQueryChange={search.onQueryChange}
                        onSearch={search.onSearch}
                        onSelectPlace={(place) => onFocusViewport({
                            center: place.coordinates,
                            zoom: PLACE_ZOOM,
                            padding: viewport.padding
                        })} />}
                <MapStatus {...status} theme={theme} />
                <MapFilterPanel
                    facets={filtering.facets}
                    selection={filtering.selection}
                    labels={labels}
                    theme={theme}
                    onToggle={filtering.onToggle}
                    onClear={filtering.onClear} />
            </MapOverlay>
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
