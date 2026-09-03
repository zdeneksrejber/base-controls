import { IRecord } from '@talxis/client-libraries';
import { findMatchingMapRule, IMapRuleCondition, parseMapRules } from './rules';

/** How one pin is drawn, once the control has worked out which rule applies to its record. */
export interface IMapPinAppearance {
    /** Fill colour of the shipped pin shape. Ignored once an image or markup is given. */
    color?: string;
    /** Image drawn instead of the shipped shape. */
    url?: string;
    /** Web resource holding that image, resolved to a url by the host. Ignored when `url` is set. */
    webResourceName?: string;
    /**
     * Markup drawn instead of the shipped shape - a chart, a badge, whatever the record calls for. Author it
     * in code; it is inserted as-is, so it must never be built out of values a user can type.
     */
    svg?: string;
    /** Size of the image or markup, in pixels. Defaults to the shipped pin size. */
    width?: number;
    height?: number;
    /** Tooltip. Defaults to the record's primary name. */
    title?: string;
}

/**
 * One entry of the `PinIcons` parameter: an appearance, and the condition a record has to meet for it.
 *
 * This is the shape the legacy MapPicker's `pinIcons` used, so an existing configuration carries over.
 */
export interface IMapPinRule extends IMapPinAppearance, IMapRuleCondition { }

/** Resolves a web resource name to a url the browser can load. */
export type IMapWebResourceResolver = (webResourceName: string) => string | undefined;

/**
 * Reads the pin rules out of the JSON a maker typed into the manifest.
 *
 * A malformed value is reported and ignored rather than allowed to break the map, since it is configuration
 * a person edits by hand.
 *
 * @param json The `PinIcons` value.
 * @returns The rules, or none when there is nothing usable to read.
 */
export const parseMapPinRules = (json?: string | null): IMapPinRule[] => parseMapRules<IMapPinRule>(json, 'PinIcons');

/**
 * Works out how a record's pin should look.
 *
 * @param record Record being drawn.
 * @param rules Rules from the `PinIcons` parameter, in the order they should be tried.
 * @param resolveWebResourceUrl Turns a web resource name into a url. Omit where the host has none.
 * @returns The appearance, or `undefined` when no rule applies and the shipped pin should be used.
 */
export const getMapPinAppearance = (
    record: IRecord,
    rules: IMapPinRule[],
    resolveWebResourceUrl?: IMapWebResourceResolver
): IMapPinAppearance | undefined => {
    const rule = findMatchingMapRule(record, rules);
    if (!rule) {
        return undefined;
    }
    const { attributeName, value, webResourceName, ...appearance } = rule;
    if (!appearance.url && webResourceName) {
        const resolved = resolveWebResourceUrl?.(webResourceName);
        if (resolved) {
            return { ...appearance, url: resolved };
        }
        return appearance;
    }
    return appearance;
};

/**
 * Whether an appearance actually changes anything about how a pin is drawn.
 *
 * @param appearance Appearance to check.
 * @returns `false` for an empty one, so it can be dropped rather than carried on every location.
 */
export const isEmptyPinAppearance = (appearance?: IMapPinAppearance): boolean =>
    !appearance || (!appearance.color && !appearance.url && !appearance.svg && !appearance.title);
