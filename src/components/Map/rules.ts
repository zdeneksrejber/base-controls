import { IRecord } from '@talxis/client-libraries';
import { getRecordValue } from './attributes';

/**
 * The condition half of a rule: which records it applies to.
 *
 * Rules are tried in order and the first match wins, so a rule with no `attributeName` matches everything
 * and belongs last. This is the shape the legacy MapPicker's `pinIcons` used, and the same matching now
 * chooses both the pin and what happens when it is activated.
 */
export interface IMapRuleCondition {
    /** Attribute the rule tests, in dot notation. Omit for a rule that matches every record. */
    attributeName?: string;
    /** Value the attribute has to equal, compared as text. Omit to match any non empty value. */
    value?: string | number | boolean | null;
}

/**
 * Whether a rule applies to a record.
 *
 * @param record Record to test.
 * @param rule Rule to test it against.
 * @returns `true` for a rule with no attribute, or when the record's value matches.
 */
export const matchesMapRule = (record: IRecord, rule: IMapRuleCondition): boolean => {
    if (!rule.attributeName) {
        return true;
    }
    const value = getRecordValue(record, rule.attributeName);
    if (value === undefined || value === null || value === '') {
        return false;
    }
    //a rule naming no value matches any record that has one, which is how "has a category" is expressed
    if (rule.value === undefined || rule.value === null) {
        return true;
    }
    return `${value}` === `${rule.value}`;
};

/**
 * Finds the rule that applies to a record.
 *
 * @param record Record to match.
 * @param rules Rules in the order they should be tried.
 * @returns The first matching rule, or `undefined` when none apply.
 */
export const findMatchingMapRule = <TRule extends IMapRuleCondition>(
    record: IRecord,
    rules: TRule[]
): TRule | undefined => rules.find((rule) => matchesMapRule(record, rule));

/**
 * Reads rules out of the JSON a maker typed into a manifest property.
 *
 * A malformed value is reported and ignored rather than allowed to break the map, since it is configuration
 * a person edits by hand.
 *
 * @param json The property value. A single object is accepted as a list of one.
 * @param parameterName Property name, so the warning says which one to go and fix.
 * @returns The rules, or none when there is nothing usable to read.
 */
export const parseMapRules = <TRule extends IMapRuleCondition>(
    json: string | null | undefined,
    parameterName: string
): TRule[] => {
    if (!json?.trim()) {
        return [];
    }
    try {
        const parsed = JSON.parse(json);
        const rules = Array.isArray(parsed) ? parsed : [parsed];
        return rules.filter((rule): rule is TRule => !!rule && typeof rule === 'object');
    } catch (error) {
        console.warn(`Map: ${parameterName} is not valid JSON, so none of its rules are applied:`, error);
        return [];
    }
};
