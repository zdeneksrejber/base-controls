import type { Meta, StoryObj } from '@storybook/react'
import { useMemo } from 'react'
import { MapDemo } from '../../map/MapDemo'
import { preferredVendor } from '../../map/mapApiKeys'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from '../../map/mapSampleData'
import { mapStoryParameters } from './storyHelpers'

const INTRO = `
Pins that belong together can be drawn **connected**. Three attributes decide it, and all three are optional:

| Property | What it does |
| --- | --- |
| \`RouteAttributeName\` | Groups the pins. Records sharing a non-empty value become one line. |
| \`RouteSequenceAttributeName\` | Orders the pins along it. Without one they are drawn in dataset order. |
| \`RouteColorAttributeName\` | Colours it. The first pin on the line that has a value wins. |

A group of fewer than two pins is not a line and is dropped. Sequence sorts as a number where it is one, so
stop 10 follows stop 9 rather than stop 1.
`

const meta = {
    title: 'Map/Routes',
    tags: ['autodocs'],
    parameters: mapStoryParameters(INTRO)
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const ROUTE_PARAMETERS = {
    LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
    LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude },
    RouteAttributeName: { raw: SAMPLE_ATTRIBUTES.route },
    RouteSequenceAttributeName: { raw: SAMPLE_ATTRIBUTES.stop },
    RouteColorAttributeName: { raw: SAMPLE_ATTRIBUTES.routeColor },
    EnableClustering: { raw: false }
}

/** The sites that belong to a run, ordered by name so the sequence attribute has something to prove. */
const getRouteRecords = () => getSiteRecords()
    .filter((record) => !!record.route)
    .sort((left, right) => `${left.name}`.localeCompare(`${right.name}`))

const Connections = ({ snap, vendor }: { snap: boolean; vendor: string }) => {
    const dataset = useMemo(() => createSampleDataset({ records: getRouteRecords() }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...ROUTE_PARAMETERS,
                SnapRoutesToRoads: { raw: snap },
                DefaultVendor: { raw: vendor }
            }}
        />
    )
}

export const StraightConnections: Story = {
    name: 'Connect pins into a line',
    render: () => <Connections snap={false} vendor='leaflet' />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Three delivery runs. The records are handed over sorted by name, so without the sequence',
                    'attribute the lines would zigzag; with it each run goes depot → stop 2 → stop 3 → stop 4.',
                    'North is blue, south red, west green, each colour read off the records themselves.',
                    '',
                    'Four of the fifteen sites belong to no run and are drawn as plain pins.'
                ].join(' ')
            }
        }
    }
}

export const SnappedConnections: Story = {
    name: 'Follow the roads instead',
    render: () => <Connections snap vendor={preferredVendor('mapy')} />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The same three runs with `SnapRoutesToRoads` on, resolved through whichever configured vendor',
                    'has a directions service — Mapy.com here, OSRM when no key is set. The lines now follow the',
                    'road network rather than cutting across country.',
                    '',
                    'Optional in every sense: a control that does not ask for it draws straight lines, a vendor',
                    'with no directions service leaves them straight, and a single run the service cannot resolve',
                    'stays straight while the others are snapped. A straight line is a worse drawing of the same',
                    'truth, never a wrong one. It costs one request per route, which is why it is off by default.',
                    '',
                    'Google is the one vendor this cannot be shown on with the demo key: its project has neither',
                    'the legacy Directions API nor the Routes API enabled, so the control reports that in the',
                    'console and leaves the lines straight.'
                ].join(' ')
            }
        }
    }
}
