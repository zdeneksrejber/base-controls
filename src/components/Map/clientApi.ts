import { useEffect, useState } from 'react';
import { IDataset, IRecord } from '@talxis/client-libraries';
import { IMapPinAppearance } from './pinAppearance';

/** Works out how one record's pin should look. Returning nothing leaves the pin to the rules below it. */
export type IMapPinResolver = (record: IRecord) => IMapPinAppearance | undefined;

/**
 * What a Client API web resource is handed.
 *
 * This is the seam for rules that configuration cannot express - anything that has to look at a related
 * record, compute a value, or decide in JavaScript. It mirrors the Client API the dataset control already
 * runs, so a customizer writes the same kind of web resource for both.
 */
export interface IMapClientApi {
    /** Dataset the map is bound to, so a customizer can register record expressions or listen to it. */
    dataset?: IDataset;
    /** Chooses how a record's pin looks. Registering again replaces the previous resolver. */
    setPinResolver: (resolver: IMapPinResolver) => void;
}

export interface IUseMapClientApi {
    /** Web resource holding the function. Nothing here leaves the Client API unused. */
    webResourceName?: string;
    functionName?: string;
    dataset?: IDataset;
}

export interface IMapClientApiState {
    /** The resolver the web resource registered, if it registered one. */
    resolvePin?: IMapPinResolver;
}

/**
 * Runs the Client API web resource a maker configured, and holds on to what it registered.
 *
 * The function is called once per web resource and function name, with the same shape the dataset control
 * uses - one argument carrying the dataset and the registration methods.
 *
 * @param props Web resource and function name, and the bound dataset to hand over.
 * @returns Whatever the web resource registered.
 */
export const useMapClientApi = (props: IUseMapClientApi): IMapClientApiState => {
    const { webResourceName, functionName, dataset } = props;
    const [state, setState] = useState<IMapClientApiState>({});

    useEffect(() => {
        if (!webResourceName || !functionName) {
            setState({});
            return;
        }
        let cancelled = false;
        const api: IMapClientApi = {
            dataset,
            setPinResolver: (resolver) => {
                if (!cancelled) {
                    setState((current) => ({ ...current, resolvePin: resolver }));
                }
            }
        };
        (async () => {
            try {
                //@ts-ignore - executeFunction is missing from @types/xrm
                await window.Xrm?.Utility?.executeFunction?.(webResourceName, functionName, [api]);
            } catch (error) {
                console.error(`Map: the Client API function "${functionName}" in "${webResourceName}" failed:`, error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [webResourceName, functionName, dataset]);

    return state;
};
