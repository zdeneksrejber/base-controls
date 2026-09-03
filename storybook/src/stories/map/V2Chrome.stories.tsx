import type { Meta, StoryObj } from '@storybook/react'
import { useMemo } from 'react'
import { MapDemo } from './MapDemo'
import { MAP_API_KEYS } from './mapApiKeys'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'

const meta = {
    title: 'Map/V2/Legend and providers',
    parameters: { layout: 'fullscreen' }
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const COORDINATES = {
    LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
    LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude }
}

const PIN_RULES = JSON.stringify([
    { attributeName: 'category', value: 'depot', color: '#c50f1f' },
    { attributeName: 'category', value: 'service', color: '#107c10' },
    { color: '#0f6cbd' }
])

/** What a maker types into the Legend property - and, at the end, what the control refuses to run. */
const LEGEND_HTML = `
<h4>Site types</h4>
<ul style="list-style:none;padding:0;margin:0">
  <li style="display:flex;align-items:center;gap:8px;padding:2px 0">
    <svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#c50f1f"></circle></svg> Distribution depot
  </li>
  <li style="display:flex;align-items:center;gap:8px;padding:2px 0">
    <svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#0f6cbd"></circle></svg> Store
  </li>
  <li style="display:flex;align-items:center;gap:8px;padding:2px 0">
    <svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#107c10"></circle></svg> Service point
  </li>
</ul>
<p style="margin-top:6px"><a href="https://www.openstreetmap.org/copyright">About this data</a></p>
<script>window.legendWasExecuted = true</script>
<img src="x" onerror="window.legendWasExecuted = true">
`

const Legend = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                PinIcons: { raw: PIN_RULES },
                Legend: { raw: LEGEND_HTML },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const HtmlLegend: Story = {
    name: 'L1 — an HTML legend, cleaned before it is shown',
    render: () => <Legend />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The `Legend` property takes markup and the control shows it over the map, collapsible.',
                    '`LegendWebResourceName` loads the same markup from a web resource instead, which is how a',
                    'legend is maintained without redeploying the wrapper.',
                    '',
                    'This is the one place the Map renders markup it did not write, so it is cleaned first.',
                    'The markup on this page deliberately ends with a `<script>` and an `<img onerror>`; neither',
                    'reaches the page. Formatting, inline SVG swatches, styles and links survive, and a surviving',
                    'link is rewritten to open detached from the app.'
                ].join(' ')
            }
        }
    }
}

const PointsOfInterest = ({ show }: { show: boolean }) => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords().slice(0, 3) }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                ShowPointsOfInterest: { raw: show },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: MAP_API_KEYS.google ? 'google' : 'here' }
            }}
        />
    )
}

export const PointsOfInterestHidden: Story = {
    name: 'M2 — points of interest hidden (the default)',
    render: () => <PointsOfInterest show={false} />,
    parameters: {
        docs: {
            description: {
                story: [
                    'By default the map draws no points of interest of its own, so the only pins are the records.',
                    'Google is the one vendor whose tiles can express this properly, through a map style; HERE',
                    'approximates it with a lower detail style, and the raster tile services that cannot express',
                    'it at all ignore the property rather than pretending.'
                ].join(' ')
            }
        }
    }
}

export const PointsOfInterestShown: Story = {
    name: 'M2 — points of interest shown',
    render: () => <PointsOfInterest show />,
    parameters: {
        docs: {
            description: {
                story: 'The same map with `ShowPointsOfInterest` on: shops, stations and landmarks come back.'
            }
        }
    }
}

const Providers = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{ ...COORDINATES, EnableClustering: { raw: false }, DefaultVendor: { raw: 'leaflet' } }}
        />
    )
}

export const SwitchProviders: Story = {
    name: 'M1 — switch between the four providers',
    render: () => <Providers />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The picker in the corner offers every vendor whose api key is configured. Switching redraws',
                    'the same pins through a different map, and the new one opens on the view the last one was',
                    'showing rather than snapping back to the pins.',
                    '',
                    'Geo-coding, reverse geo-coding and directions are separate capabilities from rendering, and',
                    'no vendor has to offer all of them: a provider missing one borrows from another that is',
                    'configured rather than the feature turning off.'
                ].join(' ')
            }
        }
    }
}
