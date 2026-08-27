import type { Meta, StoryObj } from '@storybook/react'
import { Controls, Markdown, Primary, Subtitle, Title } from '@storybook/addon-docs/blocks'
import { useEffect, useMemo, useState } from 'react'
import type { IDataProviderEventListeners } from '@talxis/client-libraries'
import { IMapOutputs, IMapViewport, Map, resolveLocationFromIpAddress } from '@talxis/base-controls/components/Map'
import { useEventEmitter } from '@talxis/base-controls/hooks'
import { googleMapsVendor } from '@talxis/base-controls/components/Map/providers/GoogleMaps'
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
from api keys configured in the manifest. The knobs above are those manifest properties.

This page passes \`resolveLocationFromIpAddress\` as \`onResolveFallbackLocation\`, so with **Show pins** off it
calls the third-party geojs.io service to work out where to centre. The control never does that on its own.
`

const API_REFERENCE = `
## Reference

### Props — \`IMap\`

| Prop | Type | Required | Notes |
|------|------|:--------:|-------|
| \`context\` | \`IContext\` | ✅ | The PCF context. Used for user settings and the Fluent design language the theme is derived from. |
| \`parameters\` | \`IMapParameters\` | ✅ | See below. |
| \`translations\` | \`IMapTranslations\` | — | \`mapProvider\`, the label of the provider picker. Also reaches providers as \`labels\`, so provider chrome can be localized from the same place. |
| \`state\` | \`ComponentFramework.Dictionary\` | — | Part of the shared \`IControl\` contract. **This control ignores it.** |
| \`onNotifyOutputChanged\` | \`(outputs: IMapOutputs) => void\` | — | Fires when the user pans, zooms, or picks another provider. |
| \`onOverrideComponentProps\` | \`(props: IMapProviderProps) => IMapProviderProps\` | — | Escape hatch to rewrite what the provider receives. Prefer passing your own provider. |
| \`onGetMapVendors\` | \`() => IMapVendor[]\` | — | Vendors registered on top of the built-in ones, so the control builds them from manifest keys too. The Google Maps path, and the extension point for a vendor of your own. |
| \`onGetMapProvider\` | \`() => IMapProvider\` | — | One provider, built by the host. Takes the vendor list over entirely. Return a stable component. |
| \`onGetMapProviders\` | \`() => IMapProviderOption[]\` | — | A list of providers built by the host. Takes the vendor list over entirely; the picker shows from two options up. |
| \`onResolveFallbackLocation\` | \`(signal: AbortSignal) => Promise<IMapCoordinates \\| null>\` | — | Centers the map while the dataset has no pins. Unset by default — the control makes no third-party request unless you opt in. |

### \`parameters\` — \`IMapParameters\`

| Parameter | Type | Required | Manifest | Notes |
|-----------|------|:--------:|:--------:|-------|
| \`Dataset\` | \`IDataset\` | ✅ | \`data-set\` | Records become pins. Loading is the host's job; the control reads what is loaded and listens for \`onNewDataLoaded\` and \`onRecordsSelected\`. |
| \`LatitudeAttributeName\` | \`IStringProperty\` | ✅ | \`SingleLine.Text\` | Static input. Attribute holding the latitude. |
| \`LongitudeAttributeName\` | \`IStringProperty\` | ✅ | \`SingleLine.Text\` | Static input. Attribute holding the longitude. |
| \`RouteAttributeName\` | \`IStringProperty\` | — | \`SingleLine.Text\` | Static input. Attribute grouping pins into routes. Empty raw value draws no routes. |
| \`LetUserSwitch\` | \`ITwoOptionsProperty\` | — | \`TwoOptions\` | Offers every configured vendor through the picker. **Defaults to \`true\`**; off draws \`DefaultVendor\` alone. |
| \`DefaultVendor\` | \`IStringProperty\` | — | \`SingleLine.Text\` | Vendor id the map opens with. **Defaults to \`leaflet\`**. An id with no configured vendor behind it falls back to \`leaflet\` and warns. |
| \`HereApiKey\` | \`IStringProperty\` | — | \`SingleLine.Text\` | Offers the HERE vendor once set. |
| \`MapyApiKey\` | \`IStringProperty\` | — | \`SingleLine.Text\` | Offers the Mapy.com vendor once set. |
| \`GoogleApiKey\` | \`IStringProperty\` | — | \`SingleLine.Text\` | Offers the Google Maps vendor once set — provided the wrapper registered \`googleMapsVendor\`, see below. |
| \`<Vendor>ApiKey\` | \`IStringProperty\` | — | \`SingleLine.Text\` | Whatever key parameter a vendor registered through \`onGetMapVendors\` declares. Keys are read by name, so a new vendor is additive. |
| \`MapProviderId\` | \`IStringProperty\` | — | \`SingleLine.Text\` | Not a configuration decision — the end user's pick, persisted. Bind it to a field to make their choice stick. Overrides \`DefaultVendor\` while it has a value. |
| \`ViewportOptions\` | \`{ raw: IMapViewportOptions }\` | — | code only | Overrides \`fallbackCenter\`, \`fallbackZoom\`, \`singleLocationZoom\`, \`approximateLocationZoom\`, \`padding\`. |

Everything the host has to supply as code — vendor descriptors, provider components, the fallback resolver — is
a prop on the control, not a parameter, matching how \`DatasetControl\` takes \`onGetControlComponent\`. That keeps
every \`parameters\` entry PCF-shaped: a dataset, an \`IProperty\`, or a \`{ raw }\` wrapper.

### \`outputs\` — \`IMapOutputs\`

| Output | Type | Notes |
|--------|------|-------|
| \`Viewport\` | \`IMapViewport\` | The viewport the provider is showing, reported on pan/zoom. Lets a host persist and restore the view. |
| \`MapProviderId\` | \`string\` | Id of the vendor the end user picked. Persist it and feed it back as the parameter to make the choice stick. |

### Wrapping into PCF

Five manifest properties are the whole vendor configuration, and the control resolves all of them itself:

\`\`\`xml
<property name="LetUserSwitch" display-name-key="Let user switch map"
          of-type="TwoOptions" usage="input" required="false" />
<property name="DefaultVendor" display-name-key="Default map vendor"
          of-type="SingleLine.Text" usage="input" required="false" />
<property name="HereApiKey" display-name-key="HERE api key"
          of-type="SingleLine.Text" usage="input" required="false" />
<property name="MapyApiKey" display-name-key="Mapy.com api key"
          of-type="SingleLine.Text" usage="input" required="false" />
<property name="GoogleApiKey" display-name-key="Google Maps api key"
          of-type="SingleLine.Text" usage="input" required="false" />
\`\`\`

Forward \`context.parameters\` straight through — bind the keys to an Environment Variable per solution and one
compiled control ships to every project unchanged. A vendor with no key configured is simply not offered.

Google Maps is the one vendor the wrapper has to name in code, because importing it is what pulls the optional
\`@vis.gl/react-google-maps\` peer dependency into the build. The key still comes from the manifest:

\`\`\`tsx
import { googleMapsVendor } from '@talxis/base-controls/dist/components/Map/providers/GoogleMaps';

//module scope, so the identity is stable
const vendors = [googleMapsVendor];

<Map context={context} parameters={context.parameters} onGetMapVendors={() => vendors} />
\`\`\`

### Adding a vendor

A vendor is a descriptor, not a control change — pass one through \`onGetMapVendors\` and it behaves exactly
like a built-in one:

\`\`\`ts
const azureMapsVendor: IMapVendor = {
    id: 'azure',
    label: 'Azure Maps',
    apiKeyParameterName: 'AzureMapsApiKey',
    createProvider: (apiKey) => createAzureMapsProvider({ apiKey })
};
\`\`\`

Add the matching optional property to the manifest and it joins \`DefaultVendor\` and the picker. Nothing about
an existing manifest changes, because keys are resolved by the name the vendor declares. Reuse a built-in id to
replace one — \`{ ...googleMapsVendor, label: 'Maps' }\`.

### Bundling into React

Outside PCF there are no manifest parameters to read, so the host builds providers itself. One provider:

\`\`\`tsx
import { Map, createHereMapsProvider } from '@talxis/base-controls';

const mapProvider = useMemo(() => createHereMapsProvider({ apiKey }), [apiKey]);

<Map
    context={pcfContext}
    parameters={{
        Dataset: dataset,
        LatitudeAttributeName: { raw: 'lat' },
        LongitudeAttributeName: { raw: 'lng' }
    }}
    onGetMapProvider={() => mapProvider}
/>
\`\`\`

Omit it for the keyless default. **Memoize the provider** — \`createXProvider\` returns a new component each
call, and a fresh identity remounts the map.

Or a list, which the end user picks from:

\`\`\`tsx
const providers = useMemo(() => [
    { id: 'osm', label: 'OpenStreetMap', provider: createLeafletMapProvider() },
    { id: 'here', label: 'HERE', provider: createHereMapsProvider({ apiKey: hereKey }) }
], [hereKey]);

<Map
    context={context}
    parameters={{ ...parameters, MapProviderId: { raw: preferredProviderId } }}
    onGetMapProviders={() => providers}
    onNotifyOutputChanged={(outputs) => outputs.MapProviderId && persist(outputs.MapProviderId)}
/>
\`\`\`

Both take the vendor list over completely — the manifest keys are ignored while either is passed, so a host
mixing its own providers with manifest-configured ones wants \`onGetMapVendors\` instead. \`id\` is the identity
of a host-built provider, config included: the control caches by it, so a rebuilt list costs nothing but a
changed id remounts the map.
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
            //demo first, reference last
            page: () => (
                <>
                    <Title />
                    <Subtitle />
                    <Markdown>{INTRO}</Markdown>
                    <Primary />
                    <Controls />
                    <Markdown>{API_REFERENCE}</Markdown>
                </>
            ),
        },
    },
} satisfies Meta<typeof MapDemo>

export default meta

type Story = StoryObj<typeof meta>

export const Overview: Story = {
    name: 'Overview',
}
