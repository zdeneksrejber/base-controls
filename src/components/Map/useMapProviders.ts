import { useCallback, useRef, useState } from "react";
import { IStringProperty } from "@interfaces";
import { IMapParameters } from "./interfaces";
import {
    DEFAULT_MAP_PROVIDER,
    DEFAULT_MAP_VENDOR_ID,
    getMapVendors,
    IMapProvider,
    IMapProviderOption,
    IMapVendor,
    useMapVendorOptions
} from "./providers";

export interface IUseMapProviders {
    /** Read for the vendor configuration and for the pick a host persisted. */
    parameters: IMapParameters;
    onGetMapProvider?: () => IMapProvider;
    onGetMapProviders?: () => IMapProviderOption[];
    onGetMapVendors?: () => IMapVendor[];
    /** Called with the id the end user picked, so the control can report it as an output. */
    onPick: (id: string) => void;
}

export interface IMapProviders {
    /** Providers offered to the end user, in picker order. The picker renders from two entries up. */
    options: IMapProviderOption[];
    /** Id of the option currently drawing the map. */
    selectedId?: string;
    /** Component that draws the map. */
    provider: IMapProvider;
    /** Hand this to the picker as its `onChange`. */
    onPickProvider: (id: string) => void;
}

//never reaches the picker - one option draws none - so it never leaks into the MapProviderId output
const CODE_PROVIDER_ID = 'code';

/**
 * Resolves which provider draws the map, out of the three ways a host can supply them: a list built in code,
 * a single provider built in code, or the vendors configured in the manifest. The first that yields anything
 * wins, so a host mixing its own providers with manifest configured ones wants `onGetMapVendors`.
 *
 * All three end up as one list, so the picker, the persisted pick and the output do not have to care which
 * of them produced it.
 */
export const useMapProviders = (props: IUseMapProviders): IMapProviders => {
    const { parameters, onPick } = props;
    const { MapProviderId, LetUserSwitch, DefaultVendor } = parameters;
    //the picker is on and the map opens on the keyless default unless the maker says otherwise
    const letUserSwitch = LetUserSwitch?.raw !== false;
    const defaultVendorId = DefaultVendor?.raw || DEFAULT_MAP_VENDOR_ID;
    //keys are read by the name their vendor declares, not by one the control knows
    const getApiKey = (parameterName: string) => (parameters[parameterName] as IStringProperty | undefined)?.raw ?? undefined;
    const vendorOptions = useMapVendorOptions({
        vendors: getMapVendors(props.onGetMapVendors?.()),
        getApiKey,
        letUserSwitch,
        defaultVendorId
    });
    const requestedProviderId = MapProviderId?.raw ?? DefaultVendor?.raw ?? undefined;
    const [pickedProviderId, setPickedProviderId] = useState(requestedProviderId);
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;

    const requestedProviderIdRef = useRef(requestedProviderId);
    //a host changing the parameter takes the choice back from the end user, so their pick goes with it
    if (requestedProviderIdRef.current !== requestedProviderId) {
        requestedProviderIdRef.current = requestedProviderId;
        setPickedProviderId(requestedProviderId);
    }

    //cached by id, so a host may rebuild the list every render - only a new id remounts the map
    const hostProviderCacheRef = useRef<{ [id: string]: IMapProvider }>({});
    const hostProviderCache: { [id: string]: IMapProvider } = {};
    const hostOptions = props.onGetMapProviders?.()?.map((option) => {
        const provider = hostProviderCacheRef.current[option.id] ?? option.provider;
        hostProviderCache[option.id] = provider;
        return provider === option.provider ? option : { ...option, provider };
    });
    hostProviderCacheRef.current = hostProviderCache;

    //a single code provider is the same list with one entry, uncached - it has no id to key a cache on
    const options = hostOptions?.length
        ? hostOptions
        : props.onGetMapProvider
            ? [{ id: CODE_PROVIDER_ID, provider: props.onGetMapProvider() }]
            : vendorOptions;

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
        onPickProvider
    };
};
