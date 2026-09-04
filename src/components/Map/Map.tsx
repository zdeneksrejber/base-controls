import { useCallback, useEffect, useMemo, useState } from "react";
import { IDataProviderEventListeners, IRecord } from "@talxis/client-libraries";
import { useControl } from "@hooks";
import { useEventEmitter } from "@hooks/useEventEmitter";
import { getClassNames } from "@utils";
import { IMap } from "./interfaces";
import { getDistinctAttributePaths } from "./internal/attributes";
import { getMapLanguageTag } from "./internal/language";
import { IMapAddressAttributes } from "./internal/addressMapping";
import { useMapEditing } from "./hooks/useMapEditing";
import { useUserLocation } from "./hooks/useUserLocation";
import { getMapPinAppearance, parseMapPinRules } from "./internal/pinAppearance";
import { useMapClientApi } from "./hooks/useMapClientApi";
import { parseMapCardRules } from "./internal/cards";
import { useMapCards } from "./hooks/useMapCards";
import { getMapWebResourceUrl } from "./internal/webResource";
import { IMapClickModifiers, IMapLocation, IMapProviderProps } from "./providers";
import { EMPTY_MAP_PINS, getMapPins, IMapFallbackCoordinates } from "./internal/pins";
import { useGeocodedLocations } from "./hooks/useGeocodedLocations";
import { useMapAttributes } from "./hooks/useMapAttributes";
import { useMapClusters } from "./hooks/useMapClusters";
import { useMapFiltering } from "./hooks/useMapFiltering";
import { useMapProviders } from "./hooks/useMapProviders";
import { useMapRecords } from "./hooks/useMapRecords";
import { useDatasetLoading } from "./hooks/useDatasetLoading";
import { useMapRoutePaths } from "./hooks/useMapRoutePaths";
import { useMapLegend } from "./hooks/useMapLegend";
import { useMapSearch } from "./hooks/useMapSearch";
import { useMapViewport } from "./hooks/useMapViewport";
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

const EMPTY_RECORDS: IRecord[] = [];

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
        PersistGeocodedCoordinates,
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
    const isRegisteringAttributes = useMapAttributes({ dataset, paths: attributePaths, enabled: EnableAttributeLinking?.raw !== false });

    const isDatasetLoading = useDatasetLoading(dataset);

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

    const placement = useMemo(() => readPins(), [readPins]);

    const geocoded = useGeocodedLocations({
        //while linked columns are still registering, coordinates read as absent - geocoding those records
        //would spend quota on pins that are about to place themselves
        records: isRegisteringAttributes ? EMPTY_RECORDS : placement.unplacedRecords,
        addressAttribute: addressAttribute ?? undefined,
        //a resolved coordinate is written back through the same attributes the map reads, so the address is
        //never sent to the service twice
        latitudeAttribute: latitudeAttribute ?? undefined,
        longitudeAttribute: longitudeAttribute ?? undefined,
        persistCoordinates: PersistGeocodedCoordinates?.raw !== false,
        geocoder,
        language,
        maxRequests: MaxGeocodingRequests?.raw ?? undefined
    });

    const pins = useMemo(
        () => (Object.keys(geocoded.coordinates).length ? readPins(geocoded.coordinates) : placement),
        [readPins, placement, geocoded.coordinates]
    );

    const resolveUserLocation = useUserLocation({ onResolveFallbackLocation: props.onResolveFallbackLocation });

    const { viewport, visibleViewport, onViewportChange, onFocusViewport } = useMapViewport({
        locations: pins.locations,
        provider: MapProvider,
        options: ViewportOptions?.raw,
        onResolveFallbackLocation: PrefillUserLocation?.raw === true
            ? resolveUserLocation
            : props.onResolveFallbackLocation,
        isDatasetLoading,
        isLoadingAllRecords: isLoading,
        isGeocoding: geocoded.isResolving,
        onChange: (changedViewport) => onNotifyOutputChanged({ Viewport: changedViewport })
    });

    const isSearchEnabled = EnableSearch?.raw === true;
    const search = useMapSearch({
        dataset,
        geocoder,
        enableAddressSearch: isSearchEnabled && EnableAddressSearch?.raw !== false,
        language
    });

    //filtered before snapping, so a hidden route never costs a directions request
    const onFilterRoutes = props.onFilterRoutes;
    const visibleRoutes = useMemo(
        () => (onFilterRoutes ? pins.routes.filter((route) => onFilterRoutes(route)) : pins.routes),
        [pins.routes, onFilterRoutes]
    );

    const routePaths = useMapRoutePaths({
        routes: visibleRoutes,
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
            //relative to what the user is actually looking at, not what the control last asked for
            zoom: location.cluster?.expansionZoom ?? visibleViewport.zoom + 2,
            padding: visibleViewport.padding
        });
    }, [onFocusViewport, visibleViewport.padding, visibleViewport.zoom]);

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

    const onOpenCard = cards.onOpenCard;
    const onLocationClick = useCallback((location: IMapLocation, modifiers?: IMapClickModifiers) => {
        //a group has no record to select, so activating one opens the card listing what it stands for
        if (location.cluster) {
            onOpenCard(location);
            return;
        }
        //ctrl/cmd toggles the record in the selection without opening a card, so several pins can be
        //picked straight off the map; a plain click selects the one record and opens its card
        if (modifiers?.ctrlKey || modifiers?.metaKey) {
            const selected = dataset?.getSelectedRecordIds() ?? [];
            dataset?.setSelectedRecordIds(selected.includes(location.id)
                ? selected.filter((id) => id !== location.id)
                : [...selected, location.id]);
            return;
        }
        dataset?.setSelectedRecordIds([location.id]);
        onOpenCard(location);
    }, [dataset, onOpenCard]);

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
            ? {
                message: labels.geocodingAddresses({
                    done: `${geocoded.resolvedCount}`,
                    count: `${geocoded.resolvedCount + geocoded.pendingCount}`
                }),
                isBusy: true
            }
            : isTruncated
                ? { message: labels.pinsTruncated({ count: `${loadedCount}` }), isWarning: true }
                //a map quietly drawing fewer pins than the view holds reads as records that are not there
                : geocoded.unplacedCount
                    ? { message: labels.geocodingCapped({ count: `${geocoded.unplacedCount}` }), isWarning: true }
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
            <MapOverlay position='top-right' direction='row' theme={theme}>
                {options.length > 1 &&
                    <MapProviderPicker
                        options={options}
                        selectedId={selectedId}
                        label={labels.mapProvider()}
                        theme={theme}
                        onChange={onPickProvider} />}
                <MapLegend html={legendHtml} labels={labels} theme={theme} />
            </MapOverlay>
        </div>
    );
};
