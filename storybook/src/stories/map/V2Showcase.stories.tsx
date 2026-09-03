import type { Meta, StoryObj } from '@storybook/react'
import { useMemo } from 'react'
import { ADAPTIVE_MAP_CARD_RENDERERS } from '@talxis/base-controls/components/Map/map-card/adaptive-card'
import { MapDemo } from './MapDemo'
import { MAP_API_KEYS } from './mapApiKeys'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'

const meta = {
    title: 'Map/V2/Everything at once',
    parameters: { layout: 'fullscreen' }
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const PIN_RULES = JSON.stringify([
    { attributeName: 'category', value: 'depot', color: '#c50f1f', title: 'Distribution depot' },
    { attributeName: 'category', value: 'service', color: '#107c10', title: 'Service point' },
    { color: '#0f6cbd' }
])

const CARD_RULES = JSON.stringify([
    {
        attributeName: 'category',
        value: 'depot',
        type: 'adaptiveCard',
        payload: JSON.stringify({
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
                { type: 'TextBlock', text: '${$root.name}', weight: 'Bolder', size: 'Medium', wrap: true },
                { type: 'TextBlock', text: '${$root.address}', isSubtle: true, wrap: true, spacing: 'None' },
                {
                    type: 'FactSet',
                    facts: [
                        { title: 'Capacity', value: '${$root.capacity}' },
                        { title: 'Opened', value: '${$root.openedOn}' },
                        { title: 'Run', value: '${$root.route}' }
                    ]
                }
            ],
            actions: [{
                type: 'Action.Submit',
                title: 'Plan a visit',
                data: { webResourceName: 'ntg_map.js', functionName: 'TALXIS.Map.planVisit' }
            }]
        })
    },
    {
        type: 'fields',
        columns: ['name', 'category', 'city', 'address', 'capacity'],
        actions: [{ label: 'Open record', webResourceName: 'ntg_map.js', functionName: 'TALXIS.Map.openRecord' }]
    }
])

const LEGEND_HTML = `
<h4 style="margin:4px 0">Site types</h4>
<ul style="list-style:none;padding:0;margin:0">
  <li style="display:flex;align-items:center;gap:8px;padding:1px 0">
    <svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#c50f1f"></circle></svg> Distribution depot
  </li>
  <li style="display:flex;align-items:center;gap:8px;padding:1px 0">
    <svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#0f6cbd"></circle></svg> Store
  </li>
  <li style="display:flex;align-items:center;gap:8px;padding:1px 0">
    <svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#107c10"></circle></svg> Service point
  </li>
</ul>
<p style="margin:6px 0 0">Lines are delivery runs, snapped to the road network.</p>
`

const Everything = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords(), pageSize: 6 }), [])
    return (
        <MapDemo
            dataset={dataset}
            height={560}
            parameters={{
                LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
                LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude },
                FullAddressAttributeName: { raw: SAMPLE_ATTRIBUTES.address },
                RouteAttributeName: { raw: SAMPLE_ATTRIBUTES.route },
                RouteSequenceAttributeName: { raw: SAMPLE_ATTRIBUTES.stop },
                RouteColorAttributeName: { raw: SAMPLE_ATTRIBUTES.routeColor },
                SnapRoutesToRoads: { raw: true },
                PinLoading: { raw: 'all' },
                EnableClustering: { raw: true },
                EnableSearch: { raw: true },
                EnableAddressSearch: { raw: true },
                FilterAttributeNames: { raw: 'category,city' },
                PinIcons: { raw: PIN_RULES },
                Cards: { raw: CARD_RULES },
                Legend: { raw: LEGEND_HTML },
                EnablePinDragging: { raw: true },
                EnablePinCreation: { raw: true },
                ShowPointsOfInterest: { raw: false },
                DefaultVendor: { raw: MAP_API_KEYS.mapy ? 'mapy' : 'leaflet' }
            }}
            onGetCardRenderers={() => ADAPTIVE_MAP_CARD_RENDERERS}
        />
    )
}

export const EverythingAtOnce: Story = {
    name: 'Every feature on one map',
    render: () => <Everything />,
    parameters: {
        docs: {
            description: {
                story: [
                    'One map with the whole checklist turned on, so the features can be seen not to fight each',
                    'other.',
                    '',
                    '**Data** — the dataset pages six at a time and `PinLoading: all` draws every page. Sites with',
                    'no coordinates are placed by geo-coding their address. Search filters the records through the',
                    "entity's quick find, or moves the map to a place. The filter panel offers the values",
                    '`category` and `city` actually hold. Overlapping pins are drawn as one carrying a count.',
                    '',
                    '**Pins** — depots red, service points green, stores blue, by conditional rules. Clicking a',
                    'depot opens an Adaptive Card; clicking anything else opens the built-in card, each with a',
                    'button that runs a web resource. A grouped pin opens every record behind it.',
                    '',
                    '**Connections** — three delivery runs, ordered by stop number, coloured per run, snapped to',
                    'the road network.',
                    '',
                    '**Interaction** — drag a pin to move its record, click empty map to create one.',
                    '',
                    '**Chrome** — a legend bottom right, the provider picker top right, and points of interest',
                    'hidden so the only pins are the records.'
                ].join(' ')
            }
        }
    }
}
