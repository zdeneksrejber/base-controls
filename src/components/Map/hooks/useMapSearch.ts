import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IColumn, IDataset, IInternalDataProvider } from '@talxis/client-libraries';
import { IMapGeocoder, IMapPlace } from '../internal/geocoding';

/** How long typing has to pause before the geo-coding service is asked about it. */
const SUGGESTION_DEBOUNCE_MS = 350;

/** Shortest query worth sending to a geo-coding service. */
const MINIMUM_SUGGESTION_LENGTH = 3;

/** Places offered under the box. Enough to choose from, few enough to read. */
const SUGGESTION_LIMIT = 5;

export interface IUseMapSearch {
    dataset?: IDataset;
    /** Geocoder used for the place suggestions. Without one the box only searches the dataset. */
    geocoder?: IMapGeocoder;
    /** Whether typing also offers places from the geo-coding service. */
    enableAddressSearch: boolean;
    language?: string;
}

export interface IMapSearchState {
    /** What is currently typed. */
    query: string;
    onQueryChange: (query: string) => void;
    /** Runs the entity's quick find over the bound dataset. */
    onSearch: (query?: string) => void;
    /** Places matching what is typed, for the suggestion list. */
    suggestions: IMapPlace[];
    isSuggesting: boolean;
    /** Columns the entity's quick find searches, so the box can say what it actually looks at. */
    quickFindColumns: IColumn[];
}

/**
 * Owns the map's search box.
 *
 * Two searches share one input: committing a query runs the entity's quick find, which filters the records
 * and so the pins; typing also offers places from the geo-coding service, which move the map without
 * touching the dataset.
 */
export const useMapSearch = (props: IUseMapSearch): IMapSearchState => {
    const { dataset, geocoder, enableAddressSearch, language } = props;
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<IMapPlace[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const datasetQuery = dataset?.getSearchQuery?.() ?? '';
    const suggestionIdRef = useRef(0);

    //a host clearing the query, or another control searching the same dataset, is reflected in the box
    useEffect(() => {
        setQuery(datasetQuery);
    }, [datasetQuery]);

    const onSearch = useCallback((searched?: string) => {
        if (!dataset) {
            return;
        }
        const next = searched ?? '';
        setQuery(next);
        setSuggestions([]);
        const provider = dataset.getDataProvider() as IInternalDataProvider;
        const run = () => {
            dataset.setSearchQuery?.(next);
            void dataset.refresh();
        };
        //the same guard the dataset control's quick find uses, so unsaved edits are not silently discarded
        if (typeof provider?.executeWithUnsavedChangesBlocker === 'function') {
            provider.executeWithUnsavedChangesBlocker(run);
            return;
        }
        run();
    }, [dataset]);

    useEffect(() => {
        const suggestionId = ++suggestionIdRef.current;
        if (!enableAddressSearch || !geocoder || query.trim().length < MINIMUM_SUGGESTION_LENGTH) {
            setSuggestions([]);
            setIsSuggesting(false);
            return;
        }
        const controller = new AbortController();
        const debounce = setTimeout(() => {
            setIsSuggesting(true);
            geocoder.geocode(query, { language, limit: SUGGESTION_LIMIT, signal: controller.signal })
                .then((places) => {
                    if (suggestionIdRef.current === suggestionId) {
                        setSuggestions(places);
                    }
                })
                .catch((error) => {
                    //the cleanup below aborts the fetch on every keystroke, which is not a failure worth logging
                    if ((error as Error)?.name !== 'AbortError') {
                        console.warn('Map: the address search failed:', error);
                    }
                })
                .finally(() => {
                    if (suggestionIdRef.current === suggestionId) {
                        setIsSuggesting(false);
                    }
                });
        }, SUGGESTION_DEBOUNCE_MS);

        return () => {
            clearTimeout(debounce);
            controller.abort();
        };
    }, [query, enableAddressSearch, geocoder, language]);

    const quickFindColumns = useMemo(() => {
        const provider = dataset?.getDataProvider();
        return typeof provider?.getQuickFindColumns === 'function' ? provider.getQuickFindColumns() : [];
    }, [dataset]);

    return { query, onQueryChange: setQuery, onSearch, suggestions, isSuggesting, quickFindColumns };
};
