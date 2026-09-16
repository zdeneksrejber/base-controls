import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IDataProviderEventListeners } from "@talxis/client-libraries";
import { useControl } from "@hooks/useControl";
import { useEventEmitter } from "@hooks/useEventEmitter";
import { IMap } from "./interfaces";
import { mapTranslations } from "./translations";
import { IMapLocation, IMapProvider } from "./providers";
import { getMapViewport, IMapViewport } from "./internal/viewport";
import { createGoogleMapsProvider } from "./providers/google-maps/GoogleMapsProvider";
import { getMapStyles } from "./styles";

/**
 * Reads the pins out of the bound dataset and hands them to a provider. The contract it implements is the
 * full V2 one in `interfaces.ts`; the behaviour behind most of those parameters lands in the following
 * pull requests, so for now the control draws pins, reports the viewport and turns a pin click into a
 * dataset selection - what the V1 control did, read through the new parameters.
 */
export const Map = (props: IMap) => {
    const { Dataset: dataset, LatitudeAttributeName, LongitudeAttributeName, MapProviderId, GoogleApiKey } = props.parameters;
    const { labels, theme, onNotifyOutputChanged } = useControl('Map', props, mapTranslations);
    const [locations, setLocations] = useState<IMapLocation[]>([]);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    const styles = useMemo(() => getMapStyles(), []);
    const latitudeAttributeName = LatitudeAttributeName?.raw;
    const longitudeAttributeName = LongitudeAttributeName?.raw;

    const loadLocations = useCallback(() => {
        if (!dataset || !latitudeAttributeName || !longitudeAttributeName) {
            setLocations([]);
            return;
        }

        const records = dataset.getRecords();
        const result: IMapLocation[] = [];

        for (const record of records) {
            try {
                const latValue = record.getValue(latitudeAttributeName);
                const lngValue = record.getValue(longitudeAttributeName);

                const lat = typeof latValue === 'number' ? latValue : parseFloat(latValue);
                const lng = typeof lngValue === 'number' ? lngValue : parseFloat(lngValue);

                if (!isNaN(lat) && !isNaN(lng)) {
                    result.push({ id: record.getRecordId(), latitude: lat, longitude: lng });
                }
            } catch (error) {
                console.warn(`Failed to extract location from record ${record.getRecordId()}:`, error);
            }
        }

        setLocations(result);
    }, [dataset, latitudeAttributeName, longitudeAttributeName]);

    //dataset loading is already handled by the DatasetControl, this only syncs already loaded records into local state
    useEffect(() => {
        loadLocations();
    }, [loadLocations]);

    useEventEmitter<IDataProviderEventListeners>(dataset, 'onNewDataLoaded', loadLocations);

    //the host's list wins, matched by the id the MapProviderId parameter carries; a host may rebuild the list on
    //every render, so the component is remembered per id - a fresh identity would remount the map each time
    const hostOptions = props.onGetMapProviders?.();
    const hostOption = hostOptions?.find((option) => option.id === MapProviderId?.raw) ?? hostOptions?.[0];
    const providerCache = useRef(new globalThis.Map<string, IMapProvider>());
    if (hostOption && !providerCache.current.has(hostOption.id)) {
        providerCache.current.set(hostOption.id, hostOption.provider);
    }
    //without a host list the manifest key builds Google Maps, the one vendor shipped so far
    const googleApiKey = GoogleApiKey?.raw;
    const googleProvider = useMemo(() => googleApiKey ? createGoogleMapsProvider({ apiKey: googleApiKey }) : undefined, [googleApiKey]);
    const MapProvider = hostOption ? providerCache.current.get(hostOption.id) : googleProvider;

    const viewport = useMemo(() => getMapViewport(locations), [locations]);

    const onLocationClick = useCallback((location: IMapLocation) => {
        setSelectedLocationIds([location.id]);
        dataset?.setSelectedRecordIds([location.id]);
    }, [dataset]);

    const onViewportChange = useCallback((viewport: IMapViewport) => {
        onNotifyOutputChanged({ Viewport: viewport });
    }, [onNotifyOutputChanged]);

    return (
        <div className={styles.root}>
            {MapProvider && (
                <MapProvider
                    locations={locations}
                    routes={[]}
                    viewport={viewport}
                    selectedLocationIds={selectedLocationIds}
                    context={props.context}
                    theme={theme}
                    labels={labels}
                    onLocationClick={onLocationClick}
                    onViewportChange={onViewportChange}
                />
            )}
        </div>
    );
};
