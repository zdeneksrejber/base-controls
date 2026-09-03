import { IDataProviderEventListeners, IDataset } from "@talxis/client-libraries";
import { useEffect, useState } from "react";
import { useEventEmitter } from "@hooks/useEventEmitter";

/**
 * Whether the dataset is still fetching, kept in step with what it reports.
 *
 * The map needs this to tell "there is nothing to draw" apart from "there is nothing to draw *yet*", which
 * look identical from the outside and mean opposite things.
 *
 * @param dataset Dataset to watch.
 * @returns True while the host is loading, false once it has answered.
 */
export const useDatasetLoading = (dataset: IDataset): boolean => {
    const [isLoading, setIsLoading] = useState(() => dataset.loading);

    useEventEmitter<IDataProviderEventListeners>(dataset, ['onLoading', 'onNewDataLoaded'],
        (() => setIsLoading(dataset.loading)) as IDataProviderEventListeners['onLoading']);

    //the first load can finish before this mounts, so what the dataset says now beats waiting for an event
    useEffect(() => setIsLoading(dataset.loading), [dataset]);

    return isLoading;
};
