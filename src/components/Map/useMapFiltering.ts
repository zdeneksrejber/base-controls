import { useCallback, useEffect, useMemo, useState } from 'react';
import { IDataset, IRecord } from '@talxis/client-libraries';
import {
    filterRecordsBySelection,
    getMapFilterExpression,
    getMapFilterFacets,
    IMapFilterFacet,
    IMapFilterMode,
    IMapFilterSelection,
    isMapFilterSelectionEmpty,
    toggleMapFilterValue
} from './mapFilters';

export interface IUseMapFiltering {
    dataset?: IDataset;
    /** Records the facets are built from, and filtered in `pins` mode. */
    records: IRecord[];
    /** Attribute paths to offer as facets. None turns filtering off. */
    attributes: string[];
    /** `pins` filters what the map draws, `dataset` filters the dataset every bound control shares. */
    mode: IMapFilterMode;
}

export interface IMapFilteringState {
    facets: IMapFilterFacet[];
    selection: IMapFilterSelection;
    /** Records to draw, already filtered in `pins` mode and unchanged in `dataset` mode. */
    records: IRecord[];
    onToggle: (attribute: string, value: string) => void;
    onClear: () => void;
}

/**
 * Filters the map by the values its records hold.
 *
 * In `pins` mode the filtering is applied to what the map draws, which is instant and works on every
 * provider. In `dataset` mode it is pushed to the bound dataset instead, so every control sharing it
 * follows - at the cost of needing a provider that implements the `In` operator for those attributes.
 *
 * @param props Bound dataset, the loaded records, the attributes to offer, and where to apply the filter.
 * @returns The facets, what is picked, the records to draw, and how to change the selection.
 */
export const useMapFiltering = (props: IUseMapFiltering): IMapFilteringState => {
    const { dataset, records, attributes, mode } = props;
    const [selection, setSelection] = useState<IMapFilterSelection>({});

    //the facets describe what is loaded, so in dataset mode they are rebuilt from the filtered result
    const facets = useMemo(
        () => (attributes.length ? getMapFilterFacets(records, attributes, dataset?.getDataProvider()?.getColumns() ?? []) : []),
        [records, attributes, dataset]
    );

    const attributeKey = attributes.join('|');
    //an attribute that stopped being offered must not keep filtering the map from memory
    useEffect(() => {
        setSelection({});
    }, [attributeKey, mode]);

    useEffect(() => {
        if (mode !== 'dataset' || !dataset) {
            return;
        }
        const provider = dataset.getDataProvider();
        provider.setFiltering(getMapFilterExpression(selection));
        void dataset.refresh();
    }, [selection, mode, dataset]);

    const onToggle = useCallback((attribute: string, value: string) => {
        setSelection((current) => toggleMapFilterValue(current, attribute, value));
    }, []);

    const onClear = useCallback(() => setSelection({}), []);

    const filteredRecords = useMemo(
        () => (mode === 'pins' && !isMapFilterSelectionEmpty(selection)
            ? filterRecordsBySelection(records, selection)
            : records),
        [records, selection, mode]
    );

    return { facets, selection, records: filteredRecords, onToggle, onClear };
};
