import type { Meta, StoryObj } from '@storybook/react'
import { Controls, Description, Primary, Title } from '@storybook/addon-docs/blocks'
import { useMemo } from 'react'
import { ADAPTIVE_MAP_CARD_RENDERERS } from '@talxis/base-controls/components/Map/map-card/adaptive-card'
import { MapApiKeyPanel } from './MapApiKeyPanel'
import { MapDemo } from './MapDemo'
import { preferredVendor } from './mapApiKeys'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'
import { ADAPTIVE_CARD_TEMPLATE, LEGEND_HTML, PIN_RULES } from './mapSampleConfig'
import { mapStoryParameters } from './storyHelpers'
//the Code panel reads this page's own hooks back out of this file, so it shows them as they were written
import hookSource from './Overview.stories.tsx?raw'

const MANIFEST = 'Manifest properties'

interface IOverviewProps {
    defaultVendor: 'leaflet' | 'here' | 'mapy' | 'google'
    letUserSwitch: boolean
    showPointsOfInterest: boolean
    groupOverlappingPins: boolean
    colourPinsByCategory: boolean
    cardType: 'fields' | 'adaptiveCard'
    showSearch: boolean
    filterAttributes: string
    connectRoutes: boolean
    snapRoutesToRoads: boolean
    showLegend: boolean
    allowEditing: boolean
}

const getAdaptiveCardRenderers = () => ADAPTIVE_MAP_CARD_RENDERERS

const OverviewPlayground = (props: IOverviewProps) => {
    const dataset = useMemo(() => createSampleDataset({ records: getSiteRecords() }), [])
    return (
        <MapDemo
            dataset={dataset}
            height={560}
            parameters={{
                LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
                LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude },
                FullAddressAttributeName: { raw: SAMPLE_ATTRIBUTES.address },
                DefaultVendor: { raw: props.defaultVendor },
                LetUserSwitch: { raw: props.letUserSwitch },
                ShowPointsOfInterest: { raw: props.showPointsOfInterest },
                EnableClustering: { raw: props.groupOverlappingPins },
                PinIcons: { raw: props.colourPinsByCategory ? PIN_RULES : '' },
                CardType: { raw: props.cardType },
                CardPayload: { raw: props.cardType === 'adaptiveCard' ? ADAPTIVE_CARD_TEMPLATE : '' },
                CardColumns: { raw: 'name,category,city,address,capacity' },
                EnableSearch: { raw: props.showSearch },
                FilterAttributeNames: { raw: props.filterAttributes },
                RouteAttributeName: { raw: props.connectRoutes ? SAMPLE_ATTRIBUTES.route : '' },
                RouteSequenceAttributeName: { raw: SAMPLE_ATTRIBUTES.stop },
                RouteColorAttributeName: { raw: SAMPLE_ATTRIBUTES.routeColor },
                SnapRoutesToRoads: { raw: props.snapRoutesToRoads },
                Legend: { raw: props.showLegend ? LEGEND_HTML : '' },
                EnablePinDragging: { raw: props.allowEditing },
                EnablePinCreation: { raw: props.allowEditing }
            }}
            hookSource={hookSource}
            onGetCardRenderers={getAdaptiveCardRenderers}
        />
    )
}

const INTRO = `
Draws the records of a bound dataset as pins on a map. The control owns everything that is not vendor
specific — reading coordinates off the dataset, geo-coding the ones that have none, grouping pins that
overlap, deciding what a pin looks like and what it opens, connecting pins into lines, and deciding where the
map should look. Drawing is delegated to a **provider**.

Four vendors ship with it — **OpenStreetMap** (the default, and keyless), **HERE**, **Mapy.com** and
**Google Maps** — and the control builds all four itself from api keys configured in the manifest.

Every switch below is a manifest property. Turn them on and off to see what the control does; each one has a
page of its own in the sidebar that goes into why it behaves the way it does.

**OpenStreetMap needs no key**, so everything here works as it stands. To see the other three vendors, paste
your own keys into the panel just below — they stay in your browser, and every map on every page redraws with
them. The same panel is behind the **Api keys** button above each map.

Beside that button is a **Code** toggle, which swaps the map for the exact configuration that page hands the
control — imports included, so it can be copied straight into a wrapper.

The full API — props, parameters, outputs, the manifest to wrap it in, and how to add a vendor of your own —
is in [the control's README](https://github.com/TALXIS/base-controls/blob/master/src/components/Map/README.md).
`

const meta = {
    title: 'Map/Overview',
    component: OverviewPlayground,
    tags: ['autodocs'],
    argTypes: {
        defaultVendor: {
            control: 'inline-radio',
            options: ['leaflet', 'here', 'mapy', 'google'],
            table: { category: MANIFEST },
            description: 'The vendor the map opens with. One whose api key is not filled in falls back to OpenStreetMap and warns.'
        },
        letUserSwitch: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: 'Whether the picker offers every configured vendor, or the map draws the default alone.'
        },
        showPointsOfInterest: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: 'Whether the map draws the shops and landmarks its vendor knows about. Off by default, so the only pins are the records.'
        },
        groupOverlappingPins: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: 'Whether pins that overlap in the current view are drawn as one carrying a count.'
        },
        colourPinsByCategory: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: 'Applies pin rules: depots red, service points green, everything else blue.'
        },
        cardType: {
            control: 'inline-radio',
            options: ['fields', 'adaptiveCard'],
            table: { category: MANIFEST },
            description: 'What a pin opens: the built-in card of record attributes, or an Adaptive Card template.'
        },
        showSearch: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: "Puts a search box on the map. It runs the entity's quick find, and offers places to move the map to."
        },
        filterAttributes: {
            control: 'text',
            table: { category: MANIFEST },
            description: 'Attributes the filter panel offers, comma separated. Empty hides the panel.'
        },
        connectRoutes: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: 'Connects pins sharing a route value into a line, ordered and coloured by their own attributes.'
        },
        snapRoutesToRoads: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: 'Whether those lines follow the road network instead of running straight between the pins.'
        },
        showLegend: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: 'Shows a legend over the map. The markup is cleaned before it is inserted.'
        },
        allowEditing: {
            control: 'boolean',
            table: { category: MANIFEST },
            description: 'Lets a pin be dragged to move its record, and a click on empty map create one. Both off by default.'
        }
    },
    args: {
        defaultVendor: preferredVendor('mapy', 'here') as IOverviewProps['defaultVendor'],
        letUserSwitch: true,
        showPointsOfInterest: false,
        groupOverlappingPins: true,
        colourPinsByCategory: true,
        cardType: 'fields',
        showSearch: true,
        filterAttributes: 'category,city',
        connectRoutes: true,
        snapRoutesToRoads: true,
        showLegend: true,
        allowEditing: false
    },
    parameters: {
        ...mapStoryParameters(INTRO),
        docs: {
            ...mapStoryParameters(INTRO).docs,
            //composed by hand so the keys come before the map: a reader of the published Storybook has no
            //`.env.local` to fill in, and is not going to clone the repository to get one
            page: () => (
                <>
                    <Title />
                    <Description />
                    <MapApiKeyPanel isFramed />
                    <Primary />
                    <Controls />
                </>
            )
        }
    }
} satisfies Meta<typeof OverviewPlayground>

export default meta
type Story = StoryObj<typeof meta>

//the same id the autodocs page takes, so the sidebar shows one row rather than Overview inside Overview
export const Overview: Story = {}
