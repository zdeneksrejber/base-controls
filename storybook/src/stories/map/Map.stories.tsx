import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useMemo, useState } from 'react'
import type { IDataProviderEventListeners } from '@talxis/client-libraries'
import { IMapOutputs, IMapViewport, Map, resolveLocationFromIpAddress } from '@talxis/base-controls/components/Map'
import { useEventEmitter } from '@talxis/base-controls/hooks'
import { googleMapsVendor } from '@talxis/base-controls/components/Map/providers/google-maps'
import { usePcfContext } from '@talxis/base-controls/utils'
import { sampleMapAttributes, useSampleMapDataset } from './useSampleMapDataset'

type IMapDemoVendor = 'leaflet' | 'here' | 'mapy' | 'google'

//every knob below is a manifest property, passed through the way a PCF wrapper would
interface IMapDemoProps {
    defaultVendor: IMapDemoVendor
    letUserSwitch: boolean
    hereApiKey: string
    mapyApiKey: string
    googleApiKey: string
    showPins: boolean
}

const MANIFEST = 'Manifest properties'
const DEMO_ONLY = 'Demo controls (not the control API)'

//the one vendor the wrapper must register: importing it is what pulls @vis.gl/react-google-maps in
const HOST_VENDORS = [googleMapsVendor]

//demo readout only, the control resolves these labels from the vendor descriptors
const VENDOR_LABELS: { [vendor in IMapDemoVendor]: string } = {
    leaflet: 'OpenStreetMap',
    here: 'HERE',
    mapy: 'Mapy.com',
    google: 'Google Maps',
}

const formatViewport = (viewport: IMapViewport) =>
    `${viewport.center.latitude.toFixed(3)}, ${viewport.center.longitude.toFixed(3)} @ zoom ${viewport.zoom}`

const MapDemo = ({
    defaultVendor,
    letUserSwitch,
    hereApiKey,
    mapyApiKey,
    googleApiKey,
    showPins,
}: IMapDemoProps) => {
    const context = usePcfContext()
    const dataset = useSampleMapDataset(showPins)
    const [outputs, setOutputs] = useState<IMapOutputs>({})
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    //stands in for the field a PCF would bind MapProviderId to
    const [providerId, setProviderId] = useState<string>(defaultVendor)
    const onGetMapVendors = useMemo(() => () => HOST_VENDORS, [])
    //mirrored here only so the demo can report them; leaflet is keyless, so it is always configured
    const configuredVendors = useMemo(() => {
        const apiKeys: { [vendor in IMapDemoVendor]: string } = {
            leaflet: 'keyless',
            here: hereApiKey,
            mapy: mapyApiKey,
            google: googleApiKey,
        }
        return (Object.keys(VENDOR_LABELS) as IMapDemoVendor[]).filter((vendor) => !!apiKeys[vendor])
    }, [hereApiKey, mapyApiKey, googleApiKey])
    const drawnVendor = configuredVendors.includes(providerId as IMapDemoVendor)
        ? (providerId as IMapDemoVendor)
        : configuredVendors[0]

    //a maker changing the default takes the choice back from the end user
    useEffect(() => setProviderId(defaultVendor), [defaultVendor])

    //the selection lives on the dataset, so the demo listens like any other bound control
    useEventEmitter<IDataProviderEventListeners>(dataset, 'onRecordsSelected', (ids: string[]) => setSelectedIds(ids ?? []))
    useEffect(() => setSelectedIds(dataset.getSelectedRecordIds()), [dataset])

    return (
        <div style={{ padding: 18 }}>
            <div style={{ height: 480 }}>
                <Map
                    context={context}
                    parameters={{
                        Dataset: dataset,
                        LatitudeAttributeName: { raw: sampleMapAttributes.latitude },
                        LongitudeAttributeName: { raw: sampleMapAttributes.longitude },
                        LetUserSwitch: { raw: letUserSwitch },
                        DefaultVendor: { raw: defaultVendor },
                        HereApiKey: { raw: hereApiKey },
                        MapyApiKey: { raw: mapyApiKey },
                        GoogleApiKey: { raw: googleApiKey },
                        MapProviderId: { raw: providerId },
                    }}
                    onGetMapVendors={onGetMapVendors}
                    onResolveFallbackLocation={resolveLocationFromIpAddress}
                    onNotifyOutputChanged={(changed: IMapOutputs) => {
                        setOutputs((current) => ({ ...current, ...changed }))
                        if (changed.MapProviderId) {
                            setProviderId(changed.MapProviderId)
                        }
                    }}
                />
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: 12 }}>
                drawn by: {VENDOR_LABELS[drawnVendor]}
                {' | '}
                switching: {letUserSwitch ? `${configuredVendors.length} vendors offered` : 'maker picked, no picker'}
                {' | '}
                selected: {selectedIds.join(', ') || 'nothing'}
                {' | '}
                outputs: {outputs.MapProviderId ?? 'no pick yet'}
                {', '}
                {outputs.Viewport ? formatViewport(outputs.Viewport) : 'viewport not reported yet'}
            </p>
        </div>
    )
}

const INTRO = `
Renders pins from a bound dataset, with drawing delegated to a swappable **provider**. Four vendors ship with
it — OpenStreetMap (default, keyless), HERE, Mapy.com and Google Maps — and the control builds all four itself
from api keys configured in the manifest. The knobs below are those manifest properties.

This page passes \`resolveLocationFromIpAddress\` as \`onResolveFallbackLocation\`, so with **Show pins** off it
calls the third-party geojs.io service to work out where to centre. The control never does that on its own.

The full API — props, parameters, outputs, the manifest to wrap it in, and how to add a vendor of your own —
is in [the control's README](https://github.com/TALXIS/base-controls/blob/master/src/components/Map/README.md).
`

const meta = {
    title: 'Map/Overview',
    component: MapDemo,
    tags: ['autodocs'],
    argTypes: {
        letUserSwitch: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: 'The `LetUserSwitch` parameter. On offers every configured vendor through the picker; off draws `DefaultVendor` alone.',
        },
        defaultVendor: {
            control: 'inline-radio',
            options: ['leaflet', 'here', 'mapy', 'google'],
            table: { category: MANIFEST },
            description: 'The `DefaultVendor` parameter — the vendor the map opens with. One without its key filled in falls back to `leaflet` and warns.',
        },
        hereApiKey: {
            control: 'text',
            table: { category: MANIFEST },
            description: 'The `HereApiKey` parameter. Offers the HERE vendor once set.',
        },
        mapyApiKey: {
            control: 'text',
            table: { category: MANIFEST },
            description: 'The `MapyApiKey` parameter. Offers the Mapy.com vendor once set.',
        },
        googleApiKey: {
            control: 'text',
            table: { category: MANIFEST },
            description: 'The `GoogleApiKey` parameter, resolved because this page registers `googleMapsVendor` through `onGetMapVendors`. Storybook reflects control values in the URL, so use a referrer-restricted test key.',
        },
        showPins: {
            control: 'boolean',
            table: { category: DEMO_ONLY },
            description: 'Adds or removes records in the sample dataset passed as the `Dataset` parameter.',
        },
    },
    args: {
        letUserSwitch: true,
        defaultVendor: 'leaflet',
        hereApiKey: '',
        mapyApiKey: '',
        googleApiKey: '',
        showPins: true,
    },
    parameters: {
        docs: {
            story: { inline: true },
            description: { component: INTRO },
        },
    },
} satisfies Meta<typeof MapDemo>

export default meta

type Story = StoryObj<typeof meta>

export const Overview: Story = {
    name: 'Overview',
}
