import type { Meta, StoryObj } from '@storybook/react'
import { useMemo } from 'react'
import { MapDemo } from './MapDemo'
import { MAP_API_KEYS } from './mapApiKeys'
import { createSampleDataset, generateSiteRecords, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'
import { mapStoryParameters } from './storyHelpers'

const COORDINATES = {
    LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
    LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude }
}

const INTRO = `
Everything about **where the pins come from**: which records are drawn, how a record with no coordinates is
placed anyway, and how the map stays usable once there are thousands of them.

## Attributes across a link entity

Every parameter that names an attribute accepts dot notation, so a record whose coordinates live on a related
address row binds directly:

\`\`\`
LatitudeAttributeName  = cds_addressid.cds_latitude
LongitudeAttributeName = cds_addressid.cds_longitude
\`\`\`

The alias in the path is the alias of the link and the lookup attribute it joins on. The control reads the
value whichever way the host supplied it — the flat aliased key Dataverse returns, or a nested object from an
expand — and where the dataset carries neither, it adds the link and the column itself, hidden so a sibling
control bound to the same dataset does not start showing them.
`

const meta = {
    title: 'Map/Data',
    tags: ['autodocs'],
    parameters: mapStoryParameters(INTRO)
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const AddressFallback = () => {
    const dataset = useMemo(() => createSampleDataset({
        //every other site keeps its coordinates, the rest carry only a postal address
        records: getSiteRecords().map((record, index) => index % 2 === 0 ? record : { ...record, lat: null, lng: null })
    }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                FullAddressAttributeName: { raw: SAMPLE_ATTRIBUTES.address },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: MAP_API_KEYS.here ? 'here' : 'leaflet' }
            }}
        />
    )
}

export const AddressesWithoutCoordinates: Story = {
    name: 'Addresses without coordinates',
    render: () => <AddressFallback />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Half of these sites have had their coordinates removed and carry only a postal address, yet',
                    'all fifteen are drawn. `FullAddressAttributeName` names that attribute, and the control places',
                    'the records by geo-coding it through whichever configured vendor has a geo-coding service.',
                    '',
                    'Lookups are cached and de-duplicated so records sharing an address cost one call, four run at',
                    'a time, `MaxGeocodingRequests` caps them, and an address the service cannot place is',
                    'remembered as unplaceable rather than asked about again on every render.'
                ].join(' ')
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

export const TheLoadedPage: Story = {
    name: 'The page the host loaded',
    render: () => <Paging loadAll={false} />,
    parameters: {
        docs: {
            description: {
                story: 'Fifteen sites in a dataset paged four at a time. `PinLoading: page`, the default, draws what the host loaded — four pins.'
            }
        }
    }
}

export const EveryPage: Story = {
    name: 'Every page of the view',
    render: () => <Paging loadAll />,
    parameters: {
        docs: {
            description: {
                story: [
                    'The same dataset, still paged four at a time, with `PinLoading: all`. All fifteen are drawn.',
                    '',
                    'The draining runs on a **clone** of the data provider, so the dataset the rest of the app is',
                    'bound to keeps its page and its pagination chrome keeps working. `MaxRecords` caps it at 50 000',
                    'so an unscoped view cannot hang the browser, and a load that stops at the cap says so rather',
                    'than quietly drawing a subset.'
                ].join(' ')
            }
        }
    }
}

const LargeDataset = () => {
    const dataset = useMemo(() => createSampleDataset({ records: generateSiteRecords(5000), pageSize: 250 }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                PinLoading: { raw: 'all' },
                EnableClustering: { raw: true },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const LargeDatasets: Story = {
    name: 'Thousands of pins',
    render: () => <LargeDataset />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Five thousand records, every page loaded. Pins that overlap in the current view are drawn as',
                    'one carrying the number behind it, and the grouping is redone against the viewport whenever',
                    'you pan or zoom — so the provider is only ever handed the pins on screen.',
                    '',
                    'Clicking a grouped pin opens a card listing the records behind it, with a button to zoom to',
                    'where the group comes apart. The grouping lives in the control rather than in a provider, so',
                    'all four vendors do it identically.'
                ].join(' ')
            }
        }
    }
}

const Filtering = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                FilterAttributeNames: { raw: 'category,city' },
                FilterMode: { raw: 'pins' },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const FilterPanel: Story = {
    name: 'Filtering by record attributes',
    render: () => <Filtering />,
    parameters: {
        docs: {
            description: {
                story: [
                    'Open the filter button top left. `FilterAttributeNames` names the attributes it offers, and',
                    'each becomes a list of the values the loaded records **actually hold**, with a count — so the',
                    'panel describes the data rather than the schema.',
                    '',
                    'Values within one attribute widen the result and attributes narrow it: "depots or stores, in',
                    'Brno". `FilterMode: pins`, the default, filters what the map draws and works on any provider;',
                    '`dataset` pushes the filter to the bound dataset instead, so every control sharing it follows.'
                ].join(' ')
            }
        }
    }
}

const Search = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                EnableSearch: { raw: true },
                EnableAddressSearch: { raw: true },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: MAP_API_KEYS.mapy ? 'mapy' : 'leaflet' }
            }}
        />
    )
}

export const SearchBox: Story = {
    name: 'Searching records, or an address',
    render: () => <Search />,
    parameters: {
        docs: {
            description: {
                story: [
                    'One box, two searches. Typing and pressing Enter runs the **entity quick find** over the bound',
                    'dataset — the same call the dataset control header makes — so the records, and therefore the',
                    'pins, are filtered. Try `Brno`, or `Praha` for two.',
                    '',
                    'Typing also offers **places** from the geo-coding service under the box. Picking one moves the',
                    'map there without touching the dataset, which is how you reach somewhere the records do not',
                    'cover. Try `Wenceslas Square`.',
                    '',
                    'The box is off by default, so a map hosted inside `DatasetControl` defers to the quick find',
                    'already in that control header rather than showing a second one.'
                ].join(' ')
            }
        }
    }
}
