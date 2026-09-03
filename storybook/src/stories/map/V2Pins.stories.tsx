import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useMemo, useState } from 'react'
import type { IRecord } from '@talxis/client-libraries'
import { ADAPTIVE_MAP_CARD_RENDERERS } from '@talxis/base-controls/components/Map/map-card/adaptive-card'
import { MapDemo } from './MapDemo'
import { installMapHostShim, IExecutedFunction } from './mapHostShim'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'

const meta = {
    title: 'Map/V2/Pins',
    parameters: { layout: 'fullscreen' }
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const COORDINATES = {
    LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
    LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude }
}

/** Rules in the shape the legacy MapPicker's `pinIcons` used: an appearance plus what a record must match. */
const PIN_RULES = JSON.stringify([
    { attributeName: 'category', value: 'depot', color: '#c50f1f', title: 'Distribution depot' },
    { attributeName: 'category', value: 'service', color: '#107c10', title: 'Service point' },
    { color: '#0f6cbd' }
])

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

export const ConditionalColours: Story = {
    name: 'P1 — a different pin per category',
    render: () => <ColouredPins />,
    parameters: {
        docs: {
            description: {
                story: [
                    '`PinIcons` is a JSON array of rules, in the shape the legacy MapPicker used. Each entry is',
                    'an appearance - `color`, `url`, `webResourceName`, `svg` - plus the `attributeName` and',
                    '`value` a record has to match. The first matching rule wins, so the entry with no',
                    '`attributeName` is the fallback and belongs last.',
                    'to zoom to where the group comes apart.',
                    'Depots are red, service points green, everything else blue. The attribute is read through the',
                    'same dot-notation resolver as every other binding, so a rule can test an attribute on a',
                    'related record.'
                ].join(' ')
            }
        }
    }
}

/**
 * A donut showing how full a site is, drawn per record.
 *
 * This is the "custom renderer" case: the appearance is computed in code, so it can be anything the record
 * justifies rather than one of a fixed set of icons.
 */
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
        />
    )
}

export const CustomRenderer: Story = {
    name: 'P1 — a chart drawn per record',
    render: () => <ChartPins />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The `onResolvePin` prop works out the appearance in code, so a pin can be anything the record',
                    'justifies. Here each site is a donut of how full it is, green through orange to red.',
                    '',
                    'The same seam is reachable from a Client API web resource through',
                    '`ClientApiWebresourceName` and `ClientApiFunctionName`, which is how a customizer writes these',
                    'rules without touching the wrapper - exactly as the dataset control already lets them.'
                ].join(' ')
            }
        }
    }
}

const CARD_COLUMNS = 'name,category,city,address,capacity'

const CARD_ACTIONS = JSON.stringify([{
    type: 'fields',
    columns: CARD_COLUMNS.split(','),
    actions: [
        { label: 'Plan a visit', webResourceName: 'ntg_map.js', functionName: 'TALXIS.Map.planVisit' },
        { label: 'Open record', webResourceName: 'ntg_map.js', functionName: 'TALXIS.Map.openRecord' }
    ]
}])

/** Shows what the control asked the host to run, so an ExecuteFunction button has something to prove. */
const useHostShim = () => {
    const [executed, setExecuted] = useState<IExecutedFunction[]>([])
    useEffect(() => {
        const shim = installMapHostShim({ onExecute: (entry) => setExecuted((current) => [...current, entry]) })
        return shim.restore
    }, [])
    return executed
}

const FieldsCard = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    const executed = useHostShim()
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                Cards: { raw: CARD_ACTIONS },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}>
            <p style={{ fontFamily: 'monospace', fontSize: 12, margin: 0 }}>
                ExecuteFunction calls: {executed.length
                    ? executed.map((entry) => `${entry.functionName}(${entry.args[0]?.recordId})`).join(', ')
                    : 'none yet - open a pin and press a button'}
            </p>
        </MapDemo>
    )
}

export const CardOnPinClick: Story = {
    name: 'P2 — a card on pin click, with ExecuteFunction buttons',
    render: () => <FieldsCard />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Clicking a pin opens one card, and opening another closes it - the control holds a single',
                    'open pin rather than asking providers to close each other\'s.',
                    '',
                    'The default card shows the attributes the rule names, read through the same dot-notation',
                    'resolver as every other binding, and renders the buttons it was given. A button runs a',
                    'function in a web resource through `ExecuteFunction`; this page installs a stand-in for the',
                    'Dataverse host so you can see what it would have called.'
                ].join(' ')
            }
        }
    }
}

const ADAPTIVE_TEMPLATE = JSON.stringify({
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
        { type: 'TextBlock', text: '${$root.name}', weight: 'Bolder', size: 'Medium', wrap: true },
        { type: 'TextBlock', text: '${$root.address}', isSubtle: true, wrap: true, spacing: 'None' },
        {
            type: 'FactSet',
            facts: [
                { title: 'Category', value: '${$root.category}' },
                { title: 'Capacity', value: '${$root.capacity_label}' },
                { title: 'Opened', value: '${$root.openedOn}' }
            ]
        }
    ],
    actions: [{
        type: 'Action.Submit',
        title: 'Plan a visit',
        data: { webResourceName: 'ntg_map.js', functionName: 'TALXIS.Map.planVisit' }
    }]
})

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
                CardPayload: { raw: ADAPTIVE_TEMPLATE },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}
            onGetCardRenderers={() => ADAPTIVE_MAP_CARD_RENDERERS}>
            <p style={{ fontFamily: 'monospace', fontSize: 12, margin: 0 }}>
                ExecuteFunction calls: {executed.length
                    ? executed.map((entry) => `${entry.functionName}(${entry.args[0]?.recordId})`).join(', ')
                    : 'none yet - open a pin and press Plan a visit'}
            </p>
        </MapDemo>
    )
}

export const AdaptiveCardOnPinClick: Story = {
    name: 'P2 — an Adaptive Card instead',
    render: () => <AdaptiveCards />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The same click, rendered through an Adaptive Card template in `CardPayload`. The renderer',
                    'lives behind its own entry point, so `adaptivecards` and `adaptivecards-templating` stay',
                    'optional peer dependencies - this page registers it through `onGetCardRenderers`.',
                    '',
                    'Note the **Capacity** fact: it binds `${$root.capacity_label}`. The record holds that value',
                    'under `capacity@OData.Community.Display.V1.FormattedValue`, which no Adaptive Cards binding',
                    'expression can address - so the control renames every annotation before expanding the',
                    'template, exactly as the legacy MapPicker did.'
                ].join(' ')
            }
        }
    }
}

const GroupedCard = () => {
    //six warehouses on one site, plus the rest of the country - so the map fits wide and the six overlap
    const dataset = useMemo(() => createSampleDataset({
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
                EnableClustering: { raw: true },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const GroupedPinCard: Story = {
    name: 'P3 — a grouped pin opens every record behind it',
    render: () => <GroupedCard />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Six warehouses on one Praha site, drawn among the rest of the country so the map fits wide',
                    'enough that they overlap. The control draws them as a single pin carrying the count.',
                    '',
                    'Clicking it opens a card listing every record behind it - each rendered by whichever card its',
                    'own rules chose - with a button to zoom to where the group comes apart. A group can stand for',
                    'thousands of records, so the card lists what the clusterer reported and counts the rest.'
                ].join(' ')
            }
        }
    }
}
