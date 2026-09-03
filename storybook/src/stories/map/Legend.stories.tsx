import type { Meta, StoryObj } from '@storybook/react'
import { useMemo } from 'react'
import { MapDemo } from './MapDemo'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'
import { LEGEND_HTML, PIN_RULES } from './mapSampleConfig'
import { mapStoryParameters } from './storyHelpers'

const INTRO = `
A map whose pins mean something needs a key to that meaning, and only the maker knows what it says. The
\`Legend\` property takes markup and the control shows it over the map, collapsible, beside the provider
picker. \`LegendWebResourceName\` loads the same markup from a web resource instead, which is how a legend is
maintained without redeploying the wrapper; it wins over \`Legend\` once it loads.

This is the one place the Map renders markup it did not write, so **it is cleaned first**. Scripts, event
handler attributes and anything that can load or submit are removed; formatting, tables, images, links and
inline SVG survive, and a surviving link is rewritten to open detached from the app.
`

const meta = {
    title: 'Map/Legend',
    tags: ['autodocs'],
    parameters: mapStoryParameters(INTRO)
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** The markup above plus the two things the control must refuse to run. */
const LEGEND_WITH_ATTACKS = `${LEGEND_HTML}
<p><a href="https://www.openstreetmap.org/copyright">About this data</a></p>
<script>window.legendWasExecuted = true</script>
<img src="x" onerror="window.legendWasExecuted = true">
`

const Legend = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
                LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude },
                PinIcons: { raw: PIN_RULES },
                Legend: { raw: LEGEND_WITH_ATTACKS },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const HtmlLegend: Story = {
    name: 'A legend over the map',
    render: () => <Legend />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The legend button sits to the right of the provider picker; open it to see the key, and note',
                    'that the swatches are inline SVG rather than images, so nothing is fetched to draw them.',
                    '',
                    'The markup on this page deliberately ends with a `<script>` and an `<img src="x" onerror=…>`.',
                    'Neither runs — open the console and check `window.legendWasExecuted`, which stays undefined.',
                    'The broken image icon under the link is that `<img>`: the element survived because images are',
                    'legitimate legend content, its handler did not, and the source was never going to load. The',
                    'heading, the list, the styles and the link all survive too.'
                ].join(' ')
            }
        }
    }
}
