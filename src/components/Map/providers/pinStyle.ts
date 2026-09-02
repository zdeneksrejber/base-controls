import { useCallback, useMemo } from 'react';
import { IMapPinAppearance } from '../pinAppearance';
import { IMapLocation } from './IMapProvider';

/** Stroke width, in pixels, of the line connecting the pins of a route. */
export const ROUTE_STROKE_WEIGHT = 4;

/** Width and height, in pixels, of a pin standing for a single record. */
export const PIN_WIDTH = 24;
export const PIN_HEIGHT = 32;

/** Diameter, in pixels, of the smallest and largest pin standing for a group. */
const CLUSTER_MIN_SIZE = 32;
const CLUSTER_MAX_SIZE = 56;

/** Group size at which a cluster pin stops growing, so one huge group does not dwarf the map. */
const CLUSTER_SIZE_CEILING = 1000;

const UNSELECTED_PIN_OPACITY = 0.45;

/**
 * Diameter of the pin standing for a group, grown with the group so a dense area reads at a glance.
 *
 * @param count Records the pin stands for.
 * @returns The diameter in pixels.
 */
export const getClusterPinSize = (count: number): number => {
    const scale = Math.min(1, Math.log10(Math.max(count, 1)) / Math.log10(CLUSTER_SIZE_CEILING));
    return Math.round(CLUSTER_MIN_SIZE + (CLUSTER_MAX_SIZE - CLUSTER_MIN_SIZE) * scale);
};

/**
 * Shortens a group size to what fits inside a pin.
 *
 * @param count Records the pin stands for.
 * @returns The count, or a rounded form of it once it runs to four digits.
 */
export const getClusterPinLabel = (count: number): string => {
    if (count < 1000) {
        return `${count}`;
    }
    if (count < 10000) {
        return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return `${Math.round(count / 1000)}k`;
};

/**
 * The SVG a pin standing for a single record is drawn from.
 *
 * @param color Fill colour, normally the host theme's primary.
 * @returns The markup, sized `PIN_WIDTH` by `PIN_HEIGHT`.
 */
export const getPinSvg = (color: string): string =>
    `<svg width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0a12 12 0 0 0-12 12c0 8.5 12 20 12 20s12-11.5 12-20A12 12 0 0 0 12 0z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
        <circle cx="12" cy="12" r="4.5" fill="#ffffff" />
    </svg>`;

/**
 * The SVG a pin standing for a group is drawn from, carrying the number of records behind it.
 *
 * @param count Records the pin stands for.
 * @param color Fill colour, normally the host theme's primary.
 * @param textColor Colour of the count, normally the theme's contrasting text.
 * @returns The markup, sized by `getClusterPinSize`.
 */
export const getClusterPinSvg = (count: number, color: string, textColor: string): string => {
    const size = getClusterPinSize(count);
    const label = getClusterPinLabel(count);
    const fontSize = size <= 36 ? 12 : size <= 46 ? 14 : 16;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}" opacity="0.25" />
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
              font-family="Segoe UI, system-ui, sans-serif" font-size="${fontSize}" font-weight="600"
              fill="${textColor}">${label}</text>
    </svg>`;
};

/**
 * How visible a pin is, given what the dataset has selected.
 *
 * Nothing selected reads as everything selected, so an unfiltered dataset is not a dimmed map. A pin
 * standing for a group is never dimmed either - it may well contain the selection.
 *
 * @param location Pin to style.
 * @param selectedIds Ids the dataset has selected.
 * @returns The opacity to draw it at.
 */
export const getPinOpacity = (location: IMapLocation, selectedIds: Set<string>): number =>
    location.cluster || selectedIds.size === 0 || selectedIds.has(location.id) ? 1 : UNSELECTED_PIN_OPACITY;

/** Turns the dataset selection into pin styling, so every provider dims the pins outside it identically. */
export const useMapPinSelection = (selectedLocationIds: string[]) => {
    const selectedIds = useMemo(() => new Set(selectedLocationIds), [selectedLocationIds]);
    const isSelected = useCallback((location: IMapLocation) => selectedIds.has(location.id), [selectedIds]);
    const getOpacity = useCallback((location: IMapLocation) => getPinOpacity(location, selectedIds), [selectedIds]);

    return { isSelected, getOpacity };
};

/** Size a pin is drawn at, taking whatever its appearance asked for and falling back to the shipped size. */
export interface IMapPinSize {
    width: number;
    height: number;
}

/**
 * The size a pin is drawn at.
 *
 * @param appearance Appearance the control resolved, if any.
 * @param fallback Size to use when the appearance says nothing.
 * @returns The width and height in pixels.
 */
export const getPinSize = (appearance?: IMapPinAppearance, fallback: IMapPinSize = { width: PIN_WIDTH, height: PIN_HEIGHT }): IMapPinSize => ({
    width: appearance?.width ?? fallback.width,
    height: appearance?.height ?? fallback.height
});

/**
 * The markup a pin is drawn from, given what the control resolved for it.
 *
 * Custom markup wins over an image, an image over a colour, and a colour over the theme - which is the order
 * of how specific each one is about the record it stands for.
 *
 * @param appearance Appearance the control resolved, if any.
 * @param defaultColor Colour the shipped pin takes when nothing else says otherwise.
 * @returns The markup, or `undefined` when the pin is an image the caller should draw instead.
 */
export const getPinMarkup = (appearance: IMapPinAppearance | undefined, defaultColor: string): string | undefined => {
    if (appearance?.svg) {
        return appearance.svg;
    }
    if (appearance?.url) {
        return undefined;
    }
    return getPinSvg(appearance?.color ?? defaultColor);
};

/**
 * A pin image as markup, so a renderer that only takes HTML can draw one.
 *
 * @param url Image url.
 * @param size Size to draw it at.
 * @returns An `img` element sized to the pin.
 */
export const getPinImageMarkup = (url: string, size: IMapPinSize): string =>
    `<img src="${url}" width="${size.width}" height="${size.height}" alt="" style="display:block" />`;
