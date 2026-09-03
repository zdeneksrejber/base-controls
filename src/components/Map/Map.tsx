import { useCallback, useEffect, useMemo, useState } from "react";
import { IDataProviderEventListeners, IRecord } from "@talxis/client-libraries";
import { useControl } from "@hooks";
import { useEventEmitter } from "@hooks/useEventEmitter";
import { getClassNames } from "@utils";
import { IMap } from "./interfaces";
import { getDistinctAttributePaths } from "./attributes";
import { getMapLanguageTag } from "./language";
import { IMapAddressAttributes } from "./addressMapping";
import { useMapEditing } from "./useMapEditing";
import { useUserLocation } from "./useUserLocation";
import { getMapPinAppearance, parseMapPinRules } from "./pinAppearance";
import { useMapClientApi } from "./clientApi";
import { parseMapCardRules } from "./cards";
import { useMapCards } from "./useMapCards";
import { getMapWebResourceUrl } from "./webResource";
import { IMapLocation, IMapProviderProps } from "./providers";
import { EMPTY_MAP_PINS, getMapPins, IMapFallbackCoordinates } from "./pins";
import { useGeocodedLocations } from "./useGeocodedLocations";
import { useMapAttributes } from "./useMapAttributes";
import { useMapClusters } from "./useMapClusters";
import { useMapFiltering } from "./useMapFiltering";
import { useMapProviders } from "./useMapProviders";
import { useMapRecords } from "./useMapRecords";
import { useMapRoutePaths } from "./useMapRoutePaths";
import { useMapLegend } from "./useMapLegend";
import { useMapSearch } from "./useMapSearch";
import { useMapViewport } from "./useMapViewport";
import { mapTranslations } from "./translations";
import { getMapStyles } from "./styles";
import { MapLegend } from "./map-legend";
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
        RouteSequenceAttributeName,
        RouteColorAttributeName,
        SnapRoutesToRoads,
        FullAddressAttributeName,
        MaxGeocodingRequests,
        EnableAttributeLinking,
        PinLoading,
        MaxRecords,
        PinIcons,
        ClientApiWebresourceName,
        ClientApiFunctionName,
        Cards,
        CardColumns,
        CardType,
        CardPayload,
        EnablePinDragging,
        EnablePinCreation,
        PrefillUserLocation,
        CountryAttributeName,
        AdministrativeAreaAttributeName,
        LocalityAttributeName,
        SublocalityAttributeName,
        StreetAttributeName,
        StreetNameAttributeName,
        StreetNumberAttributeName,
        PostalCodeAttributeName,
        Legend,
        LegendWebResourceName,
        ShowPointsOfInterest,
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

    const { options, selectedId, provider: MapProvider, geocoder, directions, onPickProvider } = useMapProviders({
        parameters: props.parameters,
        onGetMapProviders: props.onGetMapProviders,
        onGetMapVendors: props.onGetMapVendors,
        onPick: (id) => onNotifyOutputChanged({ MapProviderId: id })
    });

    //raw values as the dependency, so a host has to memoize nothing to keep the pins stable
    const latitudeAttribute = LatitudeAttributeName?.raw;
    const longitudeAttribute = LongitudeAttributeName?.raw;
    const routeAttribute = RouteAttributeName?.raw;
    const routeSequenceAttribute = RouteSequenceAttributeName?.raw;
    const routeColorAttribute = RouteColorAttributeName?.raw;
    const addressAttribute = FullAddressAttributeName?.raw;

    const filterAttributes = useMemo(
        () => (FilterAttributeNames?.raw ?? '').split(',').map((name) => name.trim()).filter(Boolean),
        [FilterAttributeNames?.raw]
    );

    const addressAttributes = useMemo<IMapAddressAttributes>(() => ({
        fullAddress: addressAttribute ?? undefined,
        country: CountryAttributeName?.raw ?? undefined,
        administrativeArea: AdministrativeAreaAttributeName?.raw ?? undefined,
        locality: LocalityAttributeName?.raw ?? undefined,
        sublocality: SublocalityAttributeName?.raw ?? undefined,
        street: StreetAttributeName?.raw ?? undefined,
        streetName: StreetNameAttributeName?.raw ?? undefined,
        streetNumber: StreetNumberAttributeName?.raw ?? undefined,
        postalCode: PostalCodeAttributeName?.raw ?? undefined
    }), [
        addressAttribute,
        CountryAttributeName?.raw,
        AdministrativeAreaAttributeName?.raw,
        LocalityAttributeName?.raw,
        SublocalityAttributeName?.raw,
        StreetAttributeName?.raw,
        StreetNameAttributeName?.raw,
        StreetNumberAttributeName?.raw,
        PostalCodeAttributeName?.raw
    ]);

    const attributePaths = useMemo(
        () => getDistinctAttributePaths([
            latitudeAttribute,
            longitudeAttribute,
            routeAttribute,
            routeSequenceAttribute,
            routeColorAttribute,
            ...Object.values(addressAttributes),
            ...filterAttributes
        ]),
        [
            latitudeAttribute,
            longitudeAttribute,
            routeAttribute,
            routeSequenceAttribute,
            routeColorAttribute,
            addressAttributes,
            filterAttributes
        ]
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
                route: routeAttribute ?? undefined,
                routeSequence: routeSequenceAttribute ?? undefined,
                routeColor: routeColorAttribute ?? undefined
            },
            fallbackCoordinates,
            getAppearance: resolvePinAppearance
        });
    }, [records, latitudeAttribute, longitudeAttribute, routeAttribute, routeSequenceAttribute, routeColorAttribute, resolvePinAppearance]);

    const unplacedRecords = useMemo(() => readPins().unplacedRecords, [readPins]);

    const geocoded = useGeocodedLocations({
        records: unplacedRecords,
        addressAttribute: addressAttribute ?? undefined,
        geocoder,
        language,
        maxRequests: MaxGeocodingRequests?.raw ?? undefined
    });

    const pins = useMemo(() => readPins(geocoded.coordinates), [readPins, geocoded.coordinates]);

    const resolveUserLocation = useUserLocation({ onResolveFallbackLocation: props.onResolveFallbackLocation });

    const { viewport, visibleViewport, onViewportChange, onFocusViewport } = useMapViewport({
        locations: pins.locations,
        provider: MapProvider,
        options: ViewportOptions?.raw,
        onResolveFallbackLocation: PrefillUserLocation?.raw === true
            ? resolveUserLocation
            : props.onResolveFallbackLocation,
        onChange: (changedViewport) => onNotifyOutputChanged({ Viewport: changedViewport })
    });

    const isSearchEnabled = EnableSearch?.raw === true;
    const search = useMapSearch({
        dataset,
        geocoder,
        enableAddressSearch: isSearchEnabled && EnableAddressSearch?.raw !== false,
        language
    });

    const routePaths = useMapRoutePaths({
        routes: pins.routes,
        enabled: SnapRoutesToRoads?.raw === true,
        directions,
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

    const editing = useMapEditing({
        dataset,
        latitudeAttribute: latitudeAttribute ?? undefined,
        longitudeAttribute: longitudeAttribute ?? undefined,
        addressAttributes,
        canDrag: EnablePinDragging?.raw === true,
        canCreate: EnablePinCreation?.raw === true,
        geocoder,
        language
    });

    const legendHtml = useMapLegend({
        html: Legend?.raw ?? undefined,
        webResourceName: LegendWebResourceName?.raw ?? undefined
    });

    const onZoomToCluster = useCallback((location: IMapLocation) => {
        onFocusViewport({
            center: { latitude: location.latitude, longitude: location.longitude },
            zoom: location.cluster?.expansionZoom ?? viewport.zoom + 2,
            padding: viewport.padding
        });
    }, [onFocusViewport, viewport.padding, viewport.zoom]);

    const cardRules = useMemo(() => parseMapCardRules(Cards?.raw), [Cards?.raw]);
    const cardFallback = useMemo(() => ({
        type: CardType?.raw ?? 'fields',
        columns: (CardColumns?.raw ?? '').split(',').map((name) => name.trim()).filter(Boolean),
        payload: CardPayload?.raw ?? undefined
    }), [CardType?.raw, CardColumns?.raw, CardPayload?.raw]);
    const onGetCardRenderers = props.onGetCardRenderers;
    const cardRenderers = useMemo(() => onGetCardRenderers?.(), [onGetCardRenderers]);

    const cards = useMapCards({
        records,
        rules: cardRules,
        fallback: cardFallback,
        renderers: cardRenderers,
        context: props.context,
        theme,
        labels,
        onZoomToCluster,
        onDeleteLocation: editing.onDeleteLocation,
        deletableRecordIds: editing.createdRecordIds
    });

    const onLocationClick = useCallback((location: IMapLocation) => {
        //a group has no record to select, so activating one opens the card listing what it stands for
        if (!location.cluster) {
            dataset?.setSelectedRecordIds([location.id]);
        }
        cards.onOpenCard(location);
    }, [dataset, cards]);

    const providerProps = useMemo<IMapProviderProps>(() => ({
        locations: drawnLocations,
        routes: routePaths.routes,
        viewport,
        selectedLocationIds,
        context: props.context,
        theme,
        labels,
        openCard: cards.openCard,
        showPointsOfInterest: ShowPointsOfInterest?.raw === true,
        isPinDraggable: editing.isPinDraggable,
        onLocationClick,
        onViewportChange,
        onCloseCard: cards.onCloseCard,
        onLocationDragEnd: editing.onLocationDragEnd,
        onMapClick: editing.onMapClick
    }), [
        drawnLocations,
        routePaths.routes,
        viewport,
        selectedLocationIds,
        props.context,
        theme,
        labels,
        cards.openCard,
        cards.onCloseCard,
        ShowPointsOfInterest?.raw,
        editing.isPinDraggable,
        editing.onLocationDragEnd,
        editing.onMapClick,
        onLocationClick,
        onViewportChange
    ]);

    const status = editing.isSaving
        ? { message: labels.savingRecord(), isBusy: true }
        : isLoading
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
            <MapOverlay position='bottom-right' theme={theme}>
                <MapLegend html={legendHtml} labels={labels} theme={theme} />
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
