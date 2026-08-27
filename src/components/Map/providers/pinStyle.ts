import { useCallback, useMemo } from 'react';
import { IMapLocation } from './IMapProvider';

/**
 * How pins and routes read on the map, shared by every provider so the control looks the same whichever
 * vendor happens to be drawing it.
 */

/** Opacity of pins outside the dataset selection. With nothing selected every pin is drawn fully opaque. */
export const UNSELECTED_PIN_OPACITY = 0.45;

/** Stroke width, in pixels, of the line connecting the pins of a route. */
export const ROUTE_STROKE_WEIGHT = 4;

export interface IMapPinSelection {
    /** Whether the location is part of the dataset selection, for drawing selected pins on top. */
    isSelected: (location: IMapLocation) => boolean;
    /** Opacity to draw the location's pin with. */
    getOpacity: (location: IMapLocation) => number;
}

/**
 * What the dataset selection looks like on the map, so a provider renders it rather than deciding it: with
 * nothing selected every pin is fully opaque, otherwise the ones outside the selection are dimmed.
 */
export const useMapPinSelection = (selectedLocationIds: string[]): IMapPinSelection => {
    const selectedIds = useMemo(() => new Set(selectedLocationIds), [selectedLocationIds]);
    const isSelected = useCallback((location: IMapLocation) => selectedIds.has(location.id), [selectedIds]);
    const getOpacity = useCallback((location: IMapLocation) =>
        selectedIds.size === 0 || selectedIds.has(location.id) ? 1 : UNSELECTED_PIN_OPACITY, [selectedIds]);

    return { isSelected, getOpacity };
};
