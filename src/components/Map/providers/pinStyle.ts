import { useCallback, useMemo } from 'react';
import { IMapLocation } from './IMapProvider';

/** Stroke width, in pixels, of the line connecting the pins of a route. */
export const ROUTE_STROKE_WEIGHT = 4;

const UNSELECTED_PIN_OPACITY = 0.45;

/** Turns the dataset selection into pin styling, so every provider dims the pins outside it identically. */
export const useMapPinSelection = (selectedLocationIds: string[]) => {
    const selectedIds = useMemo(() => new Set(selectedLocationIds), [selectedLocationIds]);
    const isSelected = useCallback((location: IMapLocation) => selectedIds.has(location.id), [selectedIds]);
    //nothing selected reads as everything selected, so an unfiltered dataset is not a dimmed map
    const getOpacity = useCallback((location: IMapLocation) =>
        selectedIds.size === 0 || selectedIds.has(location.id) ? 1 : UNSELECTED_PIN_OPACITY, [selectedIds]);

    return { isSelected, getOpacity };
};
