import { ReactNode } from 'react';
import { IRecord } from '@talxis/client-libraries';
import { IContext } from '@interfaces';
import { ITheme } from '@legacy';
import { IMapLocation } from '../providers';
import { findMatchingMapRule, IMapRuleCondition, parseMapRules } from './rules';
import { IMapLabels } from '../translations';

/**
 * What activating a pin does.
 *
 * `fields` shows the record's columns, `adaptiveCard` renders an Adaptive Card template, `function` runs a
 * web resource instead of showing anything, and `none` leaves the pin inert beyond selecting its record.
 */
export type IMapCardType = 'fields' | 'adaptiveCard' | 'function' | 'none';

/** A button on a card, which runs a function in a web resource. */
export interface IMapCardAction {
    label: string;
    webResourceName: string;
    functionName: string;
}

export interface IMapCardDefinition {
    type: IMapCardType;
    /** Attributes the `fields` card shows, in order. Empty shows the dataset's visible columns. */
    columns?: string[];
    /** Adaptive Card template as JSON, for the `adaptiveCard` type. */
    payload?: string;
    /** Web resource and function the `function` type runs, and the fallback for a card's actions. */
    webResourceName?: string;
    functionName?: string;
    /** Buttons the card shows, each running a function in a web resource. */
    actions?: IMapCardAction[];
    /** Heading. Defaults to the record's primary name. */
    title?: string;
}

/** One entry of the `Cards` parameter: a card, and the condition a record has to meet for it. */
export interface IMapCardRule extends IMapCardDefinition, IMapRuleCondition { }

export interface IMapCardProps {
    /** Record the card is about. */
    record: IRecord;
    /** Pin the card was opened from. */
    location: IMapLocation;
    definition: IMapCardDefinition;
    context: IContext;
    theme: ITheme;
    labels: IMapLabels;
    /** Runs one of the card's buttons. */
    onExecuteAction: (action: IMapCardAction) => void;
    /** Deletes the record. Present only for one the map itself created. */
    onDelete?: () => void;
    onClose: () => void;
}

/**
 * Renders the card for one record.
 *
 * A renderer that returns nothing opens no card, which is how the `function` type runs a web resource
 * instead of showing something.
 */
export type IMapCardRenderer = (props: IMapCardProps) => ReactNode;

/** Renderers by card type. A host adds to these through `onGetCardRenderers`. */
export interface IMapCardRenderers {
    [type: string]: IMapCardRenderer;
}

/** The card a pin opens when nothing says otherwise. */
export const DEFAULT_MAP_CARD: IMapCardDefinition = { type: 'fields' };

/** Reads the card rules out of the JSON a maker typed into the manifest. */
export const parseMapCardRules = (json?: string | null): IMapCardRule[] =>
    parseMapRules<IMapCardRule>(json, 'Cards');

/**
 * Works out what activating a record's pin should do. The same matching as the pin rules, so "depots open
 * an Adaptive Card, everything else runs a function" is expressed the same way as "depots are red".
 */
export const getMapCardDefinition = (
    record: IRecord,
    rules: IMapCardRule[],
    fallback: IMapCardDefinition = DEFAULT_MAP_CARD
): IMapCardDefinition => {
    const rule = findMatchingMapRule(record, rules);
    if (!rule) {
        return fallback;
    }
    const { attributeName, value, ...definition } = rule;
    return { ...fallback, ...definition };
};

/**
 * Suffix Dataverse appends to an attribute key to carry its display ready value.
 * Adaptive Cards templating cannot bind a key holding `@` and `.`, which is why it gets renamed.
 */
const FORMATTED_VALUE_SUFFIX = '@OData.Community.Display.V1.FormattedValue';

/** What a renamed formatted value is bound as: `${$root.statecode_label}`. */
const FORMATTED_VALUE_ALIAS = '_label';

/**
 * Copies record data with its formatted value annotations renamed to something a template can bind:
 * `statecode@OData.Community.Display.V1.FormattedValue` becomes `statecode_label`, since Adaptive Cards
 * binding cannot address a key containing `@` or `.`. Returns a copy rather than mutating in place.
 */
export const renameFormattedValueKeys = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(renameFormattedValueKeys);
    }
    if (!data || typeof data !== 'object') {
        return data;
    }
    const renamed: { [key: string]: any } = {};
    Object.entries(data).forEach(([key, value]) => {
        const name = key.includes(FORMATTED_VALUE_SUFFIX)
            ? key.replace(FORMATTED_VALUE_SUFFIX, FORMATTED_VALUE_ALIAS)
            : key;
        renamed[name] = renameFormattedValueKeys(value);
    });
    return renamed;
};
