import type { Meta, StoryObj } from '@storybook/react'
import { useMemo } from 'react'
import { MapDemo } from './MapDemo'
import { MAP_API_KEYS } from './mapApiKeys'
import { createSampleDataset, generateSiteRecords, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'

const meta = {
    title: 'Map/V2/Data',
    parameters: { layout: 'fullscreen' }
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const COORDINATES = {
    LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
    LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude }
}

const ThousandsOfPins = ({ count, clustering }: { count: number; clustering: boolean }) => {
    const dataset = useMemo(
        () => createSampleDataset({ records: generateSiteRecords(count), pageSize: 250 }),
        [count]
    )
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                PinLoading: { raw: 'all' },
                EnableClustering: { raw: clustering },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const ThousandsOfPinsClustered: Story = {
    name: 'D5 — thousands of pins, grouped by overlap',
    render: () => <ThousandsOfPins count={5000} clustering />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Five thousand records, all of them loaded (`PinLoading: all`, so the control drains every',
                    'page of the view rather than drawing the one the host loaded) and grouped by overlap in the',
                    'current viewport (`EnableClustering`, on by default).',
                    '',
                    'Each grouped pin carries the number of records behind it. Clicking one zooms to the level at',
                    'which it comes apart. Panning and zooming re-groups against what is on screen, so the',
                    'provider is only ever handed the pins inside the view.'
                ].join(' ')
            }
        }
    }
}

export const ThousandsOfPinsUngrouped: Story = {
    name: 'D5 — the same five thousand, ungrouped',
    render: () => <ThousandsOfPins count={5000} clustering={false} />,
    parameters: {
        docs: {
            description: {
                story: 'The same dataset with `EnableClustering: false`, which is what the grouping is worth avoiding.'
            }
        }
    }
}

const Paging = ({ loadAll }: { loadAll: boolean }) => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords(), pageSize: 4 }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                PinLoading: { raw: loadAll ? 'all' : 'page' },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const CurrentPageOnly: Story = {
    name: 'D4 — the loaded page alone',
    render: () => <Paging loadAll={false} />,
    parameters: {
        docs: {
            description: {
                story: 'Fifteen sites in a dataset paged four at a time. `PinLoading: page` draws only what the host loaded.'
            }
        }
    }
}

export const EveryPage: Story = {
    name: 'D4 — every page at once',
    render: () => <Paging loadAll />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The same dataset, still paged four at a time, with `PinLoading: all`. The control drains every',
                    'page on a clone of the data provider, so the dataset the rest of the app is bound to keeps its',
                    'page and its pagination chrome keeps working.'
                ].join(' ')
            }
        }
    }
}

const AddressFallback = ({ vendor }: { vendor: string }) => {
    const dataset = useMemo(() => createSampleDataset({
        //every other site keeps its coordinates, the rest carry only a postal address
        records: getSiteRecords().map((record, index) =>
            index % 2 === 0 ? record : { ...record, lat: null, lng: null })
    }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                FullAddressAttributeName: { raw: SAMPLE_ATTRIBUTES.address },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: vendor }
            }}
        />
    )
}

export const AddressGeocodingFallback: Story = {
    name: 'D1 — geo-code the address when there are no coordinates',
    render: () => <AddressFallback vendor={MAP_API_KEYS.here ? 'here' : 'leaflet'} />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Half of these sites have had their coordinates removed and carry only a postal address.',
                    '`FullAddressAttributeName` names that attribute, and the control places them by geo-coding',
                    'it through whichever configured vendor has a geo-coding service - HERE here, Nominatim when',
                    'no key is set.',
                    '',
                    'Lookups are cached and de-duplicated, capped by `MaxGeocodingRequests`, and an address the',
                    'service cannot place is remembered as unplaceable rather than asked about again.'
                ].join(' ')
            }
        }
    }
}
