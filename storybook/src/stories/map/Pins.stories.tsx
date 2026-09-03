import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useMemo, useState } from 'react'
import type { IRecord } from '@talxis/client-libraries'
import { ADAPTIVE_MAP_CARD_RENDERERS } from '@talxis/base-controls/components/Map/map-card/adaptive-card'
import { MapDemo } from './MapDemo'
import { IExecutedFunction, installMapHostShim } from './mapHostShim'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'
import { ADAPTIVE_CARD_TEMPLATE, PIN_RULES } from './mapSampleConfig'
import { mapStoryParameters, StoryNote } from './storyHelpers'
//the Code panel reads the demo hooks below out of this very file, so it shows them as they were written
import hookSource from './Pins.stories.tsx?raw'

const COORDINATES = {
    LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
    LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude }
}

const INTRO = `
Everything about **the pins themselves**: what one looks like, what it opens when it is activated, and what
happens when several land on the same spot.

## Three ways to decide, tried in order

1. **\`onResolvePin\`**, a prop, for a wrapper that works the appearance out in code.
2. **A Client API web resource**, named by \`ClientApiWebresourceName\` and \`ClientApiFunctionName\` — the
   same shape the dataset control's own Client API uses, so a customizer writes one kind of web resource for
   both.
3. **\`PinIcons\`**, a JSON array of rules a maker types into the manifest.

Anything returning nothing falls through to the next, so code refines configuration rather than replacing it.
The same matching also chooses **what a pin opens**, through the \`Cards\` property — so "depots open an
Adaptive Card, service points run a function" is one line of configuration rather than a code path.
`

const meta = {
    title: 'Map/Pins',
    tags: ['autodocs'],
    parameters: mapStoryParameters(INTRO)
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const ColouredPins = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                PinIcons: { raw: PIN_RULES },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const PinAppearance: Story = {
    name: 'A different pin per category',
    render: () => <ColouredPins />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Depots red, service points green, everything else blue. `PinIcons` is a JSON array of rules,',
                    'in the shape the legacy MapPicker used, so an existing configuration carries over:',
                    '',
                    '```json',
                    '[',
                    '  { "attributeName": "category", "value": "depot",   "color": "#c50f1f" },',
                    '  { "attributeName": "category", "value": "service", "color": "#107c10" },',
                    '  { "color": "#0f6cbd" }',
                    ']',
                    '```',
                    '',
                    'Rules are tried in order and the first match wins, so the entry with no `attributeName` is the',
                    'fallback and belongs last. An appearance can also be an image `url`, a `webResourceName` the',
                    'host resolves, or `svg` markup — and the attribute it matches on goes through the same',
                    'dot-notation resolver as every other binding, so a rule can test a related record.'
                ].join('\n')
            }
        }
    }
}

/** A donut showing how full a site is, computed per record — the custom renderer in its simplest form. */
const getCapacityPin = (record: IRecord) => {
    const capacity = Number(record.getValue('capacity')) || 0
    const fullness = Math.min(1, capacity / 600)
    const size = 34
    const radius = 13
    const circumference = 2 * Math.PI * radius
    const colour = fullness > 0.66 ? '#c50f1f' : fullness > 0.33 ? '#f7630c' : '#107c10'
    return {
        width: size,
        height: size,
        title: `${record.getValue('name')} — capacity ${capacity}`,
        svg: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="17" cy="17" r="16" fill="#ffffff" stroke="#d1d1d1" />
            <circle cx="17" cy="17" r="${radius}" fill="none" stroke="#edebe9" stroke-width="6" />
            <circle cx="17" cy="17" r="${radius}" fill="none" stroke="${colour}" stroke-width="6"
                    stroke-dasharray="${(circumference * fullness).toFixed(1)} ${circumference.toFixed(1)}"
                    transform="rotate(-90 17 17)" />
        </svg>`
    }
}

const ChartPins = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{ ...COORDINATES, EnableClustering: { raw: false }, DefaultVendor: { raw: 'leaflet' } }}
            onResolvePin={getCapacityPin}
            hookSource={hookSource}
        />
    )
}

export const CustomRenderer: Story = {
    name: 'A chart drawn per record',
    render: () => <ChartPins />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The `onResolvePin` prop works the appearance out in code, so a pin can be anything the record',
                    'justifies. Here every site is a donut of how full it is, green through orange to red.',
                    '',
                    'The markup is inserted as written, so author it in code and never build it out of values a',
                    'user can type. The same seam is reachable from a Client API web resource, which is how a',
                    'customizer writes these rules without touching the wrapper.'
                ].join(' ')
            }
        }
    }
}

/** Shows what the control asked the host to run, so an ExecuteFunction button has something to prove. */
const useHostShim = () => {
    const [executed, setExecuted] = useState<IExecutedFunction[]>([])
    useEffect(() => {
        const shim = installMapHostShim({ onExecute: (entry) => setExecuted((current) => [...current, entry]) })
        return shim.restore
    }, [])
    return executed
}

const ExecutedNote = ({ executed, hint }: { executed: IExecutedFunction[]; hint: string }) => (
    <StoryNote>
        ExecuteFunction calls: {executed.length
            ? executed.map((entry) => `${entry.functionName}(${entry.args[0]?.recordId})`).join(', ')
            : `none yet — ${hint}`}
    </StoryNote>
)

const CARD_RULES = JSON.stringify([{
    type: 'fields',
    columns: ['name', 'category', 'city', 'address', 'capacity'],
    actions: [
        { label: 'Plan a visit', webResourceName: 'ntg_map.js', functionName: 'TALXIS.Map.planVisit' },
        { label: 'Open record', webResourceName: 'ntg_map.js', functionName: 'TALXIS.Map.openRecord' }
    ]
}])

const FieldsCard = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    const executed = useHostShim()
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                Cards: { raw: CARD_RULES },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}>
            <ExecutedNote executed={executed} hint="open a pin and press a button" />
        </MapDemo>
    )
}

export const DetailCard: Story = {
    name: 'A card on pin click',
    render: () => <FieldsCard />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Clicking a pin opens one card, and opening another closes it — the control holds a single open',
                    'pin rather than asking providers to close each other\'s.',
                    '',
                    'The built-in card shows the attributes the rule names, read through the same dot-notation',
                    'resolver as every other binding, and renders the buttons it was given. A button runs a function',
                    'in a web resource through `ExecuteFunction`; this page installs a stand-in for the Dataverse',
                    'host so you can see what it would have called.'
                ].join(' ')
            }
        }
    }
}

const getAdaptiveCardRenderers = () => ADAPTIVE_MAP_CARD_RENDERERS

const AdaptiveCards = () => {
    const dataset = useMemo(() => createSampleDataset({
        //the annotation an Adaptive Card cannot bind until the control renames it
        records: getSiteRecords().map((record) => ({
            ...record,
            'capacity@OData.Community.Display.V1.FormattedValue': `${record.capacity} pallets`
        }))
    }), [])
    const executed = useHostShim()
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                CardType: { raw: 'adaptiveCard' },
                CardPayload: { raw: ADAPTIVE_CARD_TEMPLATE },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}
            hookSource={hookSource}
            onGetCardRenderers={getAdaptiveCardRenderers}>
            <ExecutedNote executed={executed} hint="open a pin and press Plan a visit" />
        </MapDemo>
    )
}

export const AdaptiveCard: Story = {
    name: 'An Adaptive Card instead',
    render: () => <AdaptiveCards />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The same click rendered through an Adaptive Card template. The renderer lives behind its own',
                    'entry point, so `adaptivecards` and `adaptivecards-templating` stay optional peer dependencies',
                    'and a consumer who renders cards from record columns never installs a card engine:',
                    '',
                    '```tsx',
                    "import { ADAPTIVE_MAP_CARD_RENDERERS } from '@talxis/base-controls/dist/components/Map/map-card/adaptive-card';",
                    '',
                    '<Map ... onGetCardRenderers={() => ADAPTIVE_MAP_CARD_RENDERERS} />',
                    '```',
                    '',
                    'Note the **Capacity** fact: it binds `${$root.capacity_label}`. The record holds that value',
                    'under `capacity@OData.Community.Display.V1.FormattedValue`, which no Adaptive Cards binding',
                    'expression can address — so the control renames every annotation before expanding the template,',
                    'exactly as the legacy MapPicker did, and copies rather than mutates so the dataset is untouched.'
                ].join('\n')
            }
        }
    }
}

const GroupedCard = () => {
    const dataset = useMemo(() => createSampleDataset({
        //six warehouses on one site, among the rest of the country - so the map fits wide and they overlap
        records: [
            ...Array.from({ length: 6 }, (_, index) => ({
                name: `Praha warehouse ${index + 1}`,
                category: index % 2 ? 'store' : 'depot',
                city: 'Praha',
                address: `Kolbenova ${900 + index}, 190 00 Praha 9`,
                capacity: 100 + index * 40,
                openedOn: `202${index}-03-01`,
                lat: 50.1038 + index * 0.0004,
                lng: 14.4806 + index * 0.0004
            })),
            ...getSiteRecords().filter((record) => record.city !== 'Praha')
        ]
    }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                CardColumns: { raw: 'name,category,capacity' },
                PinIcons: { raw: PIN_RULES },
                EnableClustering: { raw: true },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const GroupedPins: Story = {
    name: 'Pins that land on the same spot',
    render: () => <GroupedCard />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Six warehouses on one Praha site, drawn among the rest of the country so the map fits wide',
                    'enough that they overlap. The control draws them as a single pin carrying the count.',
                    '',
                    'Clicking it opens a card listing every record behind it — each rendered by whichever card its',
                    'own rules chose — with a button to zoom to where the group comes apart. A group can stand for',
                    'thousands of records, so the card lists what the grouping reported and counts the rest.'
                ].join(' ')
            }
        }
    }
}
