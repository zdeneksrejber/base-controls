import { useCallback, useRef, useState } from "react";
import { IStringProperty } from "@interfaces";
import { IMapParameters } from "../interfaces";
import { getMapDirections, getMapGeocoder } from "../providers/geoServices";
import {
    DEFAULT_MAP_PROVIDER,
    DEFAULT_MAP_VENDOR_ID,
    getMapVendors,
    IMapProviderOption,
    IMapVendor,
    useMapProviderCache,
    useMapVendorOptions
} from "../providers";

export interface IUseMapProviders {
    parameters: IMapParameters;
    onGetMapProviders?: () => IMapProviderOption[];
    onGetMapVendors?: () => IMapVendor[];
    onPick: (id: string) => void;
}

/**
 * Resolves which provider draws the map: a list the host built in code, or the vendors configured in the
 * manifest. Both end up as one list, so the picker, the persisted pick and the output do not have to care
 * which produced it. A host mixing its own providers with manifest configured ones wants `onGetMapVendors`.
 */
export const useMapProviders = (props: IUseMapProviders) => {
    const { parameters, onPick } = props;
    const { MapProviderId, LetUserSwitch, DefaultVendor } = parameters;
    //the picker is on and the map opens on the keyless default unless the maker says otherwise
    const letUserSwitch = LetUserSwitch?.raw !== false;
    const defaultVendorId = DefaultVendor?.raw || DEFAULT_MAP_VENDOR_ID;
    //keys are read by the name their vendor declares, not by one the control knows
    const getApiKey = (parameterName: string) => (parameters[parameterName] as IStringProperty | undefined)?.raw || undefined;

    //cached by id, so a host may rebuild the list every render - only a new id remounts the map
    const resolveHostOptions = useMapProviderCache();
    const hostOptions = resolveHostOptions((props.onGetMapProviders?.() ?? [])
        .map(({ id, label, provider, geocoder, directions }) => ({
            id,
            label,
            createProvider: () => provider,
            createGeocoder: geocoder && (() => geocoder),
            createDirections: directions && (() => directions)
        })));

    const vendorOptions = useMapVendorOptions({
        vendors: getMapVendors(props.onGetMapVendors?.()),
        getApiKey,
        letUserSwitch,
        defaultVendorId,
        active: !hostOptions.length
    });
    const options = hostOptions.length ? hostOptions : vendorOptions;

    //an empty MapProviderId is a field nobody has picked in yet, so it falls through to the maker's default
    const requestedProviderId = MapProviderId?.raw || DefaultVendor?.raw || undefined;
    const [pickedProviderId, setPickedProviderId] = useState(requestedProviderId);
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;

    const requestedProviderIdRef = useRef(requestedProviderId);
    //a host changing the parameter takes the choice back from the end user, so their pick goes with it
    if (requestedProviderIdRef.current !== requestedProviderId) {
        requestedProviderIdRef.current = requestedProviderId;
        setPickedProviderId(requestedProviderId);
    }

    //the picked provider can disappear when the host rebuilds the list, so the first option is the safety net
    const selectedOption = options.find((option) => option.id === pickedProviderId) ?? options[0];

    const onPickProvider = useCallback((id: string) => {
        setPickedProviderId(id);
        onPickRef.current(id);
    }, []);

    return {
        options,
        selectedId: selectedOption?.id,
        //only reachable when a host overrode the keyless Leaflet vendor away and configured nothing instead
        provider: selectedOption?.provider ?? DEFAULT_MAP_PROVIDER,
        geocoder: getMapGeocoder(options, selectedOption?.id),
        directions: getMapDirections(options, selectedOption?.id),
        onPickProvider
    };
};
