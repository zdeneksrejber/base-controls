import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useMemo, useState } from 'react'
import type { IDataProviderEventListeners, IDataset } from '@talxis/client-libraries'
import { MapDemo } from '../../map/MapDemo'
import { preferredVendor } from '../../map/mapApiKeys'
import { createSampleDataset, generateSiteRecords, getSiteRecords, SAMPLE_ATTRIBUTES } from '../../map/mapSampleData'
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
                DefaultVendor: { raw: preferredVendor('here') }
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
                    'Addresses are resolved one at a time and each coordinate is saved back to its record, which',
                    'the next story shows happening. Lookups are cached and de-duplicated so records sharing an',
                    'address cost one call, `MaxGeocodingRequests` caps how many one view resolves, and an address',
                    'the service cannot place is remembered as unplaceable rather than asked about again on every',
                    'render.'
                ].join(' ')
            }
        }
    }
}

const GEOCODED_COLUMNS = ['name', 'address', 'lat', 'lng']

/** The dataset as it stands, which is the only way to watch a coordinate land on a record. */
const GeocodedRecordTable = ({ dataset }: { dataset: IDataset }) => {
    const [, setVersion] = useState(0)
    useEffect(() => {
        const rerender = () => setVersion((current) => current + 1)
        //the control's write-back reports itself as a saved record, not as newly loaded data
        const events = ['onNewDataLoaded', 'onAfterSaved', 'onAfterRecordSaved'] as const
        events.forEach((event) => dataset.addEventListener(event, rerender as IDataProviderEventListeners[typeof event]))
        //the first load may already have finished by the time this runs, so read once rather than wait
        rerender()
        return () => events.forEach((event) =>
            dataset.removeEventListener(event, rerender as IDataProviderEventListeners[typeof event]))
    }, [dataset])

    return (
        <table style={{ fontFamily: 'monospace', fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
            <thead>
                <tr>{GEOCODED_COLUMNS.map((column) => (
                    <th key={column} style={{ textAlign: 'left', padding: '2px 8px 2px 0', opacity: 0.6 }}>{column}</th>
                ))}</tr>
            </thead>
            <tbody>
                {dataset.getRecords().map((record) => (
                    <tr key={record.getRecordId()}>
                        {GEOCODED_COLUMNS.map((column) => (
                            <td key={column} style={{ padding: '2px 8px 2px 0' }}>
                                {`${record.getValue(column) ?? ''}`.slice(0, 28) || '\u2014'}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

const CoordinatesSavedBack = () => {
    /**
     * Bumped every time the reader picks another vendor, which builds a fresh dataset below - so the vendor
     * just picked has to resolve all fifteen addresses itself.
     *
     * A demo device, not something the control does: in a real app the write-back is the whole point, and a
     * record that already carries coordinates is never geo-coded again, whoever answered the first time.
     */
    const [generation, setGeneration] = useState(0)

    //every site starts with an address and nothing else, so all fifteen have to be geo-coded
    const dataset = useMemo(() => createSampleDataset({
        records: getSiteRecords().map((record) => ({ ...record, lat: null, lng: null }))
        //a new dataset per generation, rather than emptying this one - clearing records the control is in the
        //middle of saving would race its own writes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [generation])

    return (
        <MapDemo
            dataset={dataset}
            height={460}
            onProviderChange={() => setGeneration((current) => current + 1)}
            parameters={{
                ...COORDINATES,
                FullAddressAttributeName: { raw: SAMPLE_ATTRIBUTES.address },
                EnableClustering: { raw: false },
                //the keyless provider, whose usage policy this is all about
                DefaultVendor: { raw: 'leaflet' }
            }}>
            <GeocodedRecordTable dataset={dataset} />
        </MapDemo>
    )
}

export const CoordinatesWrittenBack: Story = {
    name: 'Coordinates saved back to the record',
    render: () => <CoordinatesSavedBack />,
    parameters: {
        docs: {
            description: {
                story: [
                    'All fifteen sites start with a postal address and no coordinates. Watch the `lat` and `lng`',
                    'columns fill in one row at a time, about one a second, and a pin appear for each as it does —',
                    'that is the map resolving an address and saving the answer to the record through',
                    '`record.setValue` and `record.save()`, the same path a dragged pin takes.',
                    '',
                    "The pace is Nominatim's usage policy: one call a second, one address at a time, nothing asked",
                    "about twice. The status line counts the run off while it goes ('Resolving addresses, one at a",
                    "time… 4 of 15'). Against a real dataset the write is what ends the cost — the next person to",
                    'open the view places these records by reading what this visit saved, and the addresses are',
                    'never sent to the service again. This demo cannot show that second visit, because its sample',
                    'dataset lives in memory and is rebuilt every time the story mounts.',
                    '',
                    '**Switch vendors in the picker over the map** and this story hands the control a fresh set of',
                    'records, so the one you picked has to resolve all fifteen itself — which is the fastest way to see that the',
                    'pace belongs to the service and not to the control. OpenStreetMap takes fifteen seconds, one',
                    'call a second and one at a time, because that is what Nominatim asks for. Google, HERE and',
                    'Mapy.com price their lookups instead of pacing them, so they declare four at a time and finish',
                    'the same fifteen in about a second. Starting the records over is a demo device: a real record',
                    'that already has coordinates is never geo-coded again, whoever answered first.',
                    '',
                    '> Switching back and forth asks the public Nominatim service for the same fifteen addresses',
                    'again each time, which is the one thing its usage policy asks a caller not to do — enough of',
                    'it and the service stops answering this browser for a while, and the map says so. Use the',
                    'keyed vendors for repeated runs, and treat the OpenStreetMap pass as the once-per-page look',
                    'at what the policy actually costs.',
                    '',
                    '`PersistGeocodedCoordinates: false` turns the write off, for coordinate attributes the map may',
                    'not touch. The control falls back to that on its own where the attributes are not writable, and',
                    'then holds itself to the 25 addresses Nominatim will answer for a run whose results are thrown',
                    'away, saying how many records it left without a pin.'
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
                DefaultVendor: { raw: preferredVendor('mapy') }
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
