import type { Meta, StoryObj } from '@storybook/react'
import { useMemo } from 'react'
import type { IRecord } from '@talxis/client-libraries'
import { MapDemo } from './MapDemo'
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
                    '',
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
