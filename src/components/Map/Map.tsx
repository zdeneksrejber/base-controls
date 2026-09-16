import { useCallback, useEffect, useMemo, useState } from "react";
import { IDataProviderEventListeners } from "@talxis/client-libraries";
import { useControl } from "@hooks/useControl";
import { useEventEmitter } from "@hooks/useEventEmitter";
import { IMap } from "./interfaces";
import { mapTranslations } from "./translations";
import { DEFAULT_MAP_PROVIDER, IMapLocation } from "./providers";
import { getMapViewport, IMapViewport } from "./internal/viewport";
import { getMapStyles } from "./styles";

/**
 * Reads the pins out of the bound dataset and hands them to a provider. The contract it implements is the
 * full V2 one in `interfaces.ts`; the behaviour behind most of those parameters lands in the following
 * pull requests, so for now the control draws pins, reports the viewport and turns a pin click into a
 * dataset selection - what the V1 control did, read through the new parameters.
 */
export const Map = (props: IMap) => {
    const { Dataset: dataset, LatitudeAttributeName, LongitudeAttributeName, MapProviderId } = props.parameters;
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

    //the host's list wins, matched by the id the MapProviderId parameter carries; the component is used as
    //handed over, so a host keeps `provider` stable across renders - a fresh identity would remount the map
    const hostOptions = props.onGetMapProviders?.();
    const hostOption = hostOptions?.find((option) => option.id === MapProviderId?.raw) ?? hostOptions?.[0];
    //without a host list the map opens on the keyless built-in provider; the manifest vendors and api keys are
    //resolved once the provider hooks land
    const MapProvider = hostOption ? hostOption.provider : DEFAULT_MAP_PROVIDER;

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
