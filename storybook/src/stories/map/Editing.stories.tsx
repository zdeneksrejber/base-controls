import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useMemo, useState } from 'react'
import type { IColumn, IDataProviderEventListeners, IDataset } from '@talxis/client-libraries'
import { DataTypes } from '@talxis/client-libraries'
import { MapDemo } from './MapDemo'
import { preferredVendor } from './mapApiKeys'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'
import { ADDRESS_BINDINGS } from './mapSampleConfig'
import { mapStoryParameters } from './storyHelpers'

const COORDINATES = {
    LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
    LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude }
}

const INTRO = `
The map can **write** as well as draw. Both ways in are off unless a manifest property turns them on, because
a map that moves records when a finger slips is worse than one that does not move them at all.

Everything a record gains from the map — the coordinates it was dropped at, and the address that point turned
out to be — goes through \`record.setValue\` and \`record.save()\` on the bound dataset, so the host's own
validation, auditing and business rules run exactly as they would for a form.
`

const meta = {
    title: 'Map/Editing',
    tags: ['autodocs'],
    parameters: mapStoryParameters(INTRO)
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const ADDRESS_COLUMNS: IColumn[] = [
    { name: 'country', alias: 'country', displayName: 'Country', dataType: DataTypes.SingleLineText, order: 20, visualSizeFactor: 120 },
    { name: 'region', alias: 'region', displayName: 'Region', dataType: DataTypes.SingleLineText, order: 21, visualSizeFactor: 120 },
    { name: 'district', alias: 'district', displayName: 'District', dataType: DataTypes.SingleLineText, order: 22, visualSizeFactor: 120 },
    { name: 'street', alias: 'street', displayName: 'Street', dataType: DataTypes.SingleLineText, order: 23, visualSizeFactor: 140 },
    { name: 'streetLine', alias: 'streetLine', displayName: 'Street line', dataType: DataTypes.SingleLineText, order: 24, visualSizeFactor: 160 },
    { name: 'streetNumber', alias: 'streetNumber', displayName: 'Number', dataType: DataTypes.SingleLineText, order: 25, visualSizeFactor: 100 },
    { name: 'postalCode', alias: 'postalCode', displayName: 'Postal code', dataType: DataTypes.SingleLineText, order: 26, visualSizeFactor: 100 }
]

/** Shows what the records actually hold, which is the only way to watch a write-back land. */
const RecordTable = ({ dataset, columns }: { dataset: IDataset; columns: string[] }) => {
    const [, setVersion] = useState(0)
    useEffect(() => {
        const rerender = () => setVersion((current) => current + 1)
        //a create or an edit reports itself as a saved record, not as newly loaded data
        const events = ['onNewDataLoaded', 'onAfterSaved', 'onAfterRecordSaved'] as const
        events.forEach((event) => dataset.addEventListener(event, rerender as IDataProviderEventListeners[typeof event]))
        //the first load may already have finished by the time this runs, so read once rather than wait
        rerender()
        return () => events.forEach((event) =>
            dataset.removeEventListener(event, rerender as IDataProviderEventListeners[typeof event]))
    }, [dataset])

    const records = dataset.getRecords()
    return (
        <table style={{ fontFamily: 'monospace', fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
            <thead>
                <tr>{columns.map((column) => (
                    <th key={column} style={{ textAlign: 'left', padding: '2px 8px 2px 0', opacity: 0.6 }}>{column}</th>
                ))}</tr>
            </thead>
            <tbody>
                {records.slice(-6).map((record) => (
                    <tr key={record.getRecordId()}>
                        {columns.map((column) => (
                            <td key={column} style={{ padding: '2px 8px 2px 0' }}>
                                {`${record.getValue(column) ?? ''}`.slice(0, 28) || '—'}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

const DragPins = () => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords().slice(0, 5) }), [])
    return (
        <MapDemo
            dataset={dataset}
            height={420}
            parameters={{
                ...COORDINATES,
                EnablePinDragging: { raw: true },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: 'leaflet' }
            }}>
            <RecordTable dataset={dataset} columns={['name', 'lat', 'lng']} />
        </MapDemo>
    )
}

export const DragAPin: Story = {
    name: 'Move a record by dragging its pin',
    render: () => <DragPins />,
    parameters: {
        docs: {
            description: {
                story: [
                    '`EnablePinDragging` lets a pin be dragged, and dropping it writes the new coordinates back to',
                    'the record and saves. The table under the map is the dataset, so you can watch the values',
                    'change as you drop a pin.',
                    '',
                    'The write is not allowed to bounce the pin: the control remembers what it just saved and',
                    'ignores the dataset change that its own write causes, so the pin stays where you dropped it',
                    'instead of jumping while the save round-trips.'
                ].join(' ')
            }
        }
    }
}

const CreatePins = () => {
    const dataset = useMemo(() => createSampleDataset({
        records: [],
        columns: [
            { name: 'name', alias: 'name', displayName: 'Name', dataType: DataTypes.SingleLineText, order: 0, visualSizeFactor: 160, isPrimary: true },
            { name: 'address', alias: 'address', displayName: 'Address', dataType: DataTypes.SingleLineText, order: 1, visualSizeFactor: 240 },
            { name: 'city', alias: 'city', displayName: 'City', dataType: DataTypes.SingleLineText, order: 2, visualSizeFactor: 120 },
            ...ADDRESS_COLUMNS,
            { name: 'lat', alias: 'lat', displayName: 'Latitude', dataType: DataTypes.Decimal, order: 30, visualSizeFactor: 100 },
            { name: 'lng', alias: 'lng', displayName: 'Longitude', dataType: DataTypes.Decimal, order: 31, visualSizeFactor: 100 }
        ]
    }), [])
    return (
        <MapDemo
            dataset={dataset}
            height={400}
            parameters={{
                ...COORDINATES,
                ...ADDRESS_BINDINGS,
                EnablePinCreation: { raw: true },
                EnablePinDragging: { raw: true },
                EnableClustering: { raw: false },
                CardColumns: { raw: 'address,city,street,streetLine,postalCode,country' },
                DefaultVendor: { raw: preferredVendor('here') }
            }}>
            <RecordTable dataset={dataset} columns={['streetLine', 'city', 'postalCode', 'country', 'lat', 'lng']} />
        </MapDemo>
    )
}

export const CreateAPin: Story = {
    name: 'Create a record by clicking the map',
    render: () => <CreatePins />,
    parameters: {
        docs: {
            description: {
                story: [
                    '`EnablePinCreation` turns a click on empty map into a new record in the bound dataset. The',
                    'control reverse geo-codes the point and writes the components back to whichever attributes',
                    'are bound — full address, country, region, town, district, street, street line, house number',
                    'and postal code — so a click is a usable way to fill an address in. Watch the table fill.',
                    '',
                    'Opening the pin the map created shows a **Delete** button on its card. A component the service',
                    'could not resolve is written as empty rather than skipped, so moving a pin from a street',
                    'address into a field clears the street instead of leaving the old one behind.'
                ].join(' ')
            }
        }
    }
}

const PrefillLocation = (props: { prefillUserLocation: boolean }) => {
    const dataset = useMemo(() => createSampleDataset({ records: [] }), [])
    return (
        <MapDemo
            dataset={dataset}
            parameters={{
                ...COORDINATES,
                PrefillUserLocation: { raw: props.prefillUserLocation },
                EnablePinCreation: { raw: true },
                DefaultVendor: { raw: 'leaflet' }
            }}
        />
    )
}

export const PrefillUserLocation: StoryObj<typeof PrefillLocation> = {
    name: 'Centre on the user when there is nothing to fit',
    render: (args: { prefillUserLocation: boolean }) => <PrefillLocation {...args} />,
    argTypes: {
        prefillUserLocation: {
            control: 'boolean',
            table: { category: 'Manifest properties' },
            description: 'Whether the map centres on the user while the dataset has no pins. It asks for permission, so it starts off here.'
        }
    },
    //a docs page renders every story it has, so nothing on it may ask where you are until you ask it to
    args: { prefillUserLocation: false },
    parameters: {
        docs: {
            description: {
                story: [
                    'With no pins to fit, `PrefillUserLocation` centres the map on the user. **Turn the switch on**',
                    'to see it: the browser is asked first, because it is the only source precise enough to drop a',
                    'pin on, and the map zooms in close when it answers. A user who declines, or a browser with',
                    'nothing to say, falls through to `onResolveFallbackLocation` — an opt-in IP lookup — and the',
                    'map stays zoomed out, because that answer is only good to a city.',
                    '',
                    'It starts off here for the same reason the property is off by default in the control: it',
                    'prompts for permission, and the two maps above it on this page have no business asking. Pin',
                    'creation is on either way, so the map is a usable starting point rather than an empty one —',
                    'click to place the first record.'
                ].join(' ')
            }
        }
    }
}
