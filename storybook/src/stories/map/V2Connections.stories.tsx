import type { Meta, StoryObj } from '@storybook/react'
import { useMemo } from 'react'
import { MapDemo } from './MapDemo'
import { MAP_API_KEYS } from './mapApiKeys'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'

const meta = {
    title: 'Map/V2/Pin connections',
    parameters: { layout: 'fullscreen' }
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

/** The sites that belong to a run, shuffled so the sequence attribute has something to prove. */
const getRouteRecords = () => {
    const withRoutes = getSiteRecords().filter((record) => !!record.route)
    return [...withRoutes].sort((left, right) => `${left.name}`.localeCompare(`${right.name}`))
}

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
    name: 'C1 — connect pins into a line, ordered and coloured by attributes',
    render: () => <Connections snap={false} vendor='leaflet' />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Three delivery runs. `RouteAttributeName` groups the pins into lines,',
                    '`RouteSequenceAttributeName` orders each line by its stop number - the records are handed',
                    'over sorted by name, so without it the lines would zigzag - and `RouteColorAttributeName`',
                    'colours them: north blue, south red, west green.',
                    '',
                    'A run of fewer than two pins is not a line and is dropped. A number sorts as a number, so',
                    'stop 10 follows stop 9 rather than stop 1.'
                ].join(' ')
            }
        }
    }
}

export const SnappedConnections: Story = {
    name: 'C2 — snap those lines to the roads',
    render: () => <Connections snap vendor={MAP_API_KEYS.mapy ? 'mapy' : 'leaflet'} />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The same three runs with `SnapRoutesToRoads` on, resolved through whichever configured vendor',
                    'has a directions service - Mapy.com here, OSRM when no key is set. The lines now follow the',
                    'road network rather than cutting across country.',
                    '',
                    'Optional in every sense: a control that does not ask for it draws straight lines, a vendor',
                    'with no directions service leaves them straight, and a single run the service cannot resolve',
                    'stays straight while the others are snapped. A straight line is a worse drawing of the same',
                    'truth, never a wrong one.',
                    '',
                    'Google is the one vendor this cannot be shown on with the demo key: its project has neither',
                    'the legacy Directions API nor the Routes API enabled, so the control reports that and leaves',
                    'the lines straight.'
                ].join(' ')
            }
        }
    }
}
