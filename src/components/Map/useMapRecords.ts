import { useCallback, useEffect, useRef, useState } from 'react';
import { IDataProviderEventListeners, IDataset, IRecord } from '@talxis/client-libraries';
import { useEventEmitter } from '@hooks/useEventEmitter';
import { IMapPinLoading, loadAllDatasetRecords } from './records';

export interface IUseMapRecords {
    dataset?: IDataset;
    /** `page` draws what the host loaded, `all` drains every page of the view first. */
    loading: IMapPinLoading;
    /** Records to load before stopping, in `all` mode. */
    maxRecords?: number;
}

export interface IMapRecordsState {
    /** Records to draw as pins. */
    records: IRecord[];
    /** Whether every page is still being loaded. */
    isLoading: boolean;
    /** Records loaded so far, for a progress readout on a long load. */
    loadedCount: number;
    /** Whether the load stopped at the cap rather than at the end of the view. */
    isTruncated: boolean;
}

const EMPTY_RECORDS: IRecord[] = [];

/**
 * Resolves the records the map draws.
 *
 * In `page` mode the control reads what the host already loaded, which is how it has always behaved. In
 * `all` mode it drains every page of the view on a clone of the provider, leaving the bound dataset - and
 * any pagination chrome around it - untouched. Either way a refresh of the dataset starts it over.
 *
 * @param options Bound dataset, which records to draw, and the cap on how many.
 * @returns The records, and how the load is going.
 */
export const useMapRecords = (options: IUseMapRecords): IMapRecordsState => {
    const { dataset, loading, maxRecords } = options;
    const [state, setState] = useState<IMapRecordsState>({
        records: EMPTY_RECORDS,
        isLoading: false,
        loadedCount: 0,
        isTruncated: false
    });
    //bumped on every load so an earlier one that is still running knows to stop and to drop its result
    const loadIdRef = useRef(0);

    const load = useCallback(() => {
        const loadId = ++loadIdRef.current;
        if (!dataset) {
            setState({ records: EMPTY_RECORDS, isLoading: false, loadedCount: 0, isTruncated: false });
            return;
        }
        if (loading !== 'all') {
            const records = dataset.getRecords();
            setState({ records, isLoading: false, loadedCount: records.length, isTruncated: false });
            return;
        }
        setState((current) => ({ ...current, isLoading: true }));
        loadAllDatasetRecords(dataset, {
            maxRecords,
            isCancelled: () => loadIdRef.current !== loadId,
            onProgress: (loadedCount) => setState((current) =>
                loadIdRef.current === loadId ? { ...current, loadedCount } : current)
        })
            .then(({ records, isTruncated }) => {
                if (loadIdRef.current === loadId) {
                    setState({ records, isLoading: false, loadedCount: records.length, isTruncated });
                }
            })
            .catch((error) => {
                console.warn('Map: failed to load every page of the dataset, drawing the loaded page instead:', error);
                if (loadIdRef.current === loadId) {
                    const records = dataset.getRecords();
                    setState({ records, isLoading: false, loadedCount: records.length, isTruncated: true });
                }
            });
    }, [dataset, loading, maxRecords]);

    useEffect(() => {
        load();
    }, [load]);

    useEventEmitter<IDataProviderEventListeners>(dataset, 'onNewDataLoaded', load);

    return state;
};
