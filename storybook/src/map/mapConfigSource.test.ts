import { describe, expect, it } from 'vitest';
import { getMapConfigSource } from './mapConfigSource';

const COORDINATES = {
    LatitudeAttributeName: { raw: 'lat' },
    LongitudeAttributeName: { raw: 'lng' }
} as any;

describe('getMapConfigSource', () => {
    it('writes every configured property as the wrapper would', () => {
        const source = getMapConfigSource({ ...COORDINATES, EnableClustering: { raw: false } });
        expect(source).toContain("LatitudeAttributeName: { raw: 'lat' }");
        expect(source).toContain('EnableClustering: { raw: false }');
    });

    it('leaves out a property that was not set, since a default is not configuration', () => {
        const source = getMapConfigSource({ ...COORDINATES, Legend: { raw: '' } } as any);
        expect(source).not.toContain('Legend');
    });

    it('lifts a json rule set into a named constant rather than one escaped line', () => {
        const source = getMapConfigSource({
            ...COORDINATES,
            PinIcons: { raw: JSON.stringify([{ color: '#0f6cbd' }]) }
        } as any);
        expect(source).toContain('const PIN_ICONS = JSON.stringify([');
        expect(source).toContain('PinIcons: { raw: PIN_ICONS }');
    });

    it('inlines a short string but lifts a long one out', () => {
        const source = getMapConfigSource({
            ...COORDINATES,
            CardColumns: { raw: 'name,city' },
            Legend: { raw: `<p>${'a legend that runs on and on '.repeat(4)}</p>` }
        } as any);
        expect(source).toContain("CardColumns: { raw: 'name,city' }");
        expect(source).toContain('const LEGEND = `');
    });

    describe('the imports it emits', () => {
        //only /dist is published and this repo's stories reach src through a Vite alias, so a path copied
        //out of the panel has to be the consumer's one or it will not resolve for them
        const CONSUMER_PATHS = /'@talxis\/(base-controls(\/dist\/[\w/-]+)?|client-libraries)'/;

        const importsOf = (source: string) => source.split('\n').filter((line) => line.startsWith('import'));

        it('never points at a path the package does not publish', () => {
            const source = getMapConfigSource(COORDINATES, {
                hooks: { onResolvePin: function getPin(record: any) { return record; } },
                props: { onGetCardRenderers: '() => ADAPTIVE_MAP_CARD_RENDERERS' }
            });
            const imports = importsOf(source);
            expect(imports.length).toBeGreaterThan(0);
            imports.forEach((statement) => {
                expect(statement, statement).toMatch(CONSUMER_PATHS);
                expect(statement, statement).not.toMatch(/@talxis\/base-controls\/(?!dist\/)/);
            });
        });

        it('takes the control off the barrel and an optional peer off its own entry point', () => {
            const imports = importsOf(getMapConfigSource(COORDINATES, {
                props: { onGetCardRenderers: '() => ADAPTIVE_MAP_CARD_RENDERERS' }
            }));
            expect(imports).toContain("import { Map } from '@talxis/base-controls';");
            expect(imports).toContain(
                "import { ADAPTIVE_MAP_CARD_RENDERERS } from '@talxis/base-controls/dist/components/Map/map-card/adaptive-card';");
        });

        it('adds an import only where the snippet refers to the thing', () => {
            const withoutCards = importsOf(getMapConfigSource(COORDINATES));
            expect(withoutCards.join('\n')).not.toContain('ADAPTIVE_MAP_CARD_RENDERERS');
        });
    });

    it('renders a hook as it was authored when the module source is supplied', () => {
        const moduleSource = [
            '/** What it does. */',
            'const getPin = (record: IRecord) => ({ color: record.getValue("colour") })'
        ].join('\n');
        const source = getMapConfigSource(COORDINATES, {
            hooks: { onResolvePin: function getPin() { return undefined; } },
            hookSource: moduleSource
        });
        expect(source).toContain('/** What it does. */');
        expect(source).toContain('record: IRecord');
        expect(source).toContain('onResolvePin={getPin}');
    });

    it('states a fixed prop line verbatim', () => {
        const source = getMapConfigSource(COORDINATES, { props: { onGetMapVendors: '() => [googleMapsVendor]' } });
        expect(source).toContain('onGetMapVendors={() => [googleMapsVendor]}');
    });
});

describe('the dataset it writes out', () => {
    const sample = {
        records: [
            { name: 'Praha depot', lat: 50.1, lng: 14.48, capacity: 1200 },
            { name: 'Brno depot', lat: 49.19, lng: 16.6, capacity: 900 },
            { name: 'Plzeň', lat: 49.73, lng: 13.37, capacity: 260 }
        ],
        metadata: { PrimaryIdAttribute: 'name', QuickFindColumns: ['name', 'city'] }
    };

    it('shows the records behind the map, so a binding can be matched to real data', () => {
        const source = getMapConfigSource(COORDINATES, { sampleDataset: sample });
        expect(source).toContain("name: 'Praha depot'");
        expect(source).toContain('lat: 50.1');
        expect(source).toContain("LatitudeAttributeName: { raw: 'lat' }");
    });

    it('caps the list and counts what it left out', () => {
        const source = getMapConfigSource(COORDINATES, { sampleDataset: sample });
        expect(source).not.toContain('Plzeň');
        expect(source).toContain('//...1 more like these');
    });

    it('builds the dataset with something a reader can actually import', () => {
        const source = getMapConfigSource(COORDINATES, { sampleDataset: sample });
        expect(source).toContain("import { Dataset, MemoryDataProvider } from '@talxis/client-libraries';");
        expect(source).toContain('new Dataset(new MemoryDataProvider({');
    });

    it('writes literals as typescript rather than json', () => {
        const source = getMapConfigSource(COORDINATES, { sampleDataset: sample });
        expect(source).toContain("PrimaryIdAttribute: 'name'");
        expect(source).toContain("QuickFindColumns: ['name', 'city']");
        expect(source).not.toContain('"PrimaryIdAttribute"');
    });

    it('mentions the page size only where the page set one', () => {
        expect(getMapConfigSource(COORDINATES, { sampleDataset: sample }))
            .not.toContain('setPageSize');
        expect(getMapConfigSource(COORDINATES, { sampleDataset: { ...sample, pageSize: 4 } }))
            .toContain('dataset.paging.setPageSize(4);');
    });

    it('leaves the block out entirely when there is no sample to show', () => {
        expect(getMapConfigSource(COORDINATES)).not.toContain('const records');
    });
});

describe('a fixed prop that carries its reason', () => {
    it('writes the reason as a comment above the prop', () => {
        const source = getMapConfigSource(COORDINATES, {
            props: { onGetMapVendors: { value: '() => [googleMapsVendor]', note: 'why it is here\nsecond line' } }
        });
        expect(source).toContain('    //why it is here\n    //second line\n    onGetMapVendors={() => [googleMapsVendor]}');
    });
});
