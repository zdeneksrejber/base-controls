import { describe, expect, it } from 'vitest';
import { extractDeclaration, readHookDeclaration } from './sourceExtract';

const MODULE = `import type { IRecord } from '@talxis/client-libraries'

const UNRELATED = 1

/** A donut showing how full a site is. */
const getCapacityPin = (record: IRecord) => {
    const capacity = Number(record.getValue('capacity')) || 0
    //a template hole holds real code, brackets and all
    const svg = \`<svg width="\${capacity > 0 ? 34 : 0}">{ not a bracket }</svg>\`
    return { svg, title: 'a } in a string' }
}

//the rules a maker types
const PIN_RULES = JSON.stringify([
    { color: '#0f6cbd' }
])

export const oneLiner = () => 42

const afterwards = 'still parsed'
`;

describe('extractDeclaration', () => {
    it('lifts out a multi-line arrow, stopping at its own closing brace', () => {
        const declaration = extractDeclaration(MODULE, 'getCapacityPin');
        expect(declaration?.startsWith('const getCapacityPin = (record: IRecord) => {')).toBe(true);
        expect(declaration?.endsWith('}')).toBe(true);
        expect(declaration).not.toContain('PIN_RULES');
    });

    it('keeps the type annotation, which a transpiled function has already lost', () => {
        expect(extractDeclaration(MODULE, 'getCapacityPin')).toContain('record: IRecord');
    });

    it('is not confused by brackets inside strings or template holes', () => {
        const declaration = extractDeclaration(MODULE, 'getCapacityPin');
        expect(declaration).toContain("'a } in a string'");
        expect(declaration).toContain('${capacity > 0 ? 34 : 0}');
    });

    it('lifts out an array initializer whole', () => {
        expect(extractDeclaration(MODULE, 'PIN_RULES')).toBe(
            "const PIN_RULES = JSON.stringify([\n    { color: '#0f6cbd' }\n])");
    });

    it('lifts out an exported one-liner without swallowing what follows', () => {
        expect(extractDeclaration(MODULE, 'oneLiner')).toBe('export const oneLiner = () => 42');
    });

    it('stops a plain value at the end of its line', () => {
        expect(extractDeclaration(MODULE, 'UNRELATED')).toBe('const UNRELATED = 1');
    });

    it('returns nothing for a declaration that is not there', () => {
        expect(extractDeclaration(MODULE, 'notDefined')).toBeUndefined();
    });

    it('does not match a name that is only part of another', () => {
        expect(extractDeclaration(MODULE, 'getCapacity')).toBeUndefined();
    });
});

describe('readHookDeclaration', () => {
    it('brings the doc comment down with the declaration', () => {
        expect(readHookDeclaration(MODULE, 'getCapacityPin'))
            .toContain('/** A donut showing how full a site is. */');
    });

    it('brings a line comment down too', () => {
        expect(readHookDeclaration(MODULE, 'PIN_RULES')).toContain('//the rules a maker types');
    });

    it('falls back when the module source was not supplied', () => {
        expect(readHookDeclaration(undefined, 'getCapacityPin')).toBeUndefined();
    });

    it('falls back when the name was lost', () => {
        expect(readHookDeclaration(MODULE, '')).toBeUndefined();
    });
});
