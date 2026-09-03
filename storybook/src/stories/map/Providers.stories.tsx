import type { Meta, StoryObj } from '@storybook/react'
import { useMemo } from 'react'
import { MapDemo } from './MapDemo'
import { preferredVendor } from './mapApiKeys'
import { createSampleDataset, getSiteRecords, SAMPLE_ATTRIBUTES } from './mapSampleData'
import { mapStoryParameters } from './storyHelpers'

const INTRO = `
The control owns everything that is not vendor specific and delegates the drawing to a **provider**. Four
ship with it, and the control builds all four itself from api keys configured in the manifest:

| Vendor | Key | Renders | Geo-codes | Directions | Points of interest |
| --- | --- | :-: | :-: | :-: | :-: |
| **OpenStreetMap** | none | ✅ | ✅ Nominatim | ✅ OSRM | ✖︎ raster tiles cannot |
| **HERE** | \`HereApiKey\` | ✅ | ✅ | ✅ | ~ lower-detail style |
| **Mapy.com** | \`MapyApiKey\` | ✅ | ✅ | ✅ | ✖︎ |
| **Google Maps** | \`GoogleApiKey\` | ✅ | ✅ | ✅ Routes API | ✅ real map style |

Rendering, geo-coding and directions are **separate capabilities** — a vendor does not have to offer all
three. A provider missing one borrows from another configured vendor rather than the feature switching off,
so a Mapy-rendered map can still geo-code through HERE when that key is set.

Google Maps is the one vendor a wrapper names in code, so its npm peer is only pulled in by an app that
actually wants it:

\`\`\`tsx
import { googleMapsVendor } from '@talxis/base-controls/dist/components/Map/providers/google-maps';

<Map ... onGetMapVendors={() => [googleMapsVendor]} />
\`\`\`

Adding a vendor of your own is the same call. The
[README](https://github.com/TALXIS/base-controls/blob/master/src/components/Map/README.md) has the contract.
`

interface IProvidersProps {
    showPointsOfInterest: boolean
    letUserSwitch: boolean
}

const Providers = (props: IProvidersProps) => {
    //the two Praha sites alone, so the map opens close enough in that points of interest are drawn at all
    const dataset = useMemo(() => createSampleDataset({
        records: getSiteRecords().filter((record) => record.city === 'Praha')
    }), [])
    return (
        <MapDemo
            dataset={dataset}
            height={540}
            parameters={{
                LatitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.latitude },
                LongitudeAttributeName: { raw: SAMPLE_ATTRIBUTES.longitude },
                ShowPointsOfInterest: { raw: props.showPointsOfInterest },
                LetUserSwitch: { raw: props.letUserSwitch },
                EnableClustering: { raw: false },
                DefaultVendor: { raw: preferredVendor('google', 'here') }
            }}
        />
    )
}

const meta = {
    title: 'Map/Providers',
    component: Providers,
    tags: ['autodocs'],
    argTypes: {
        showPointsOfInterest: {
            control: 'boolean',
            table: { category: 'Manifest properties' },
            description: 'Whether the map draws the shops, stations and landmarks its vendor knows about.'
        },
        letUserSwitch: {
            control: 'boolean',
            table: { category: 'Manifest properties' },
            description: 'Whether the picker offers every configured vendor, or the map draws the default alone.'
        }
    },
    args: {
        showPointsOfInterest: false,
        letUserSwitch: true
    },
    parameters: mapStoryParameters(INTRO)
} satisfies Meta<typeof Providers>

export default meta
type Story = StoryObj<typeof meta>

export const SwitchProviders: Story = {
    name: 'Switching, and points of interest',
    parameters: {
        docs: {
            description: {
                story: [
                    'The picker in the corner offers every vendor whose api key is configured. Switching redraws',
                    'the same pins through a different map, and the new one opens on the view the last one was',
                    'showing rather than snapping back to the pins. Turn **letUserSwitch** off and the picker goes',
                    'away — the map draws the default vendor and nothing else.',
                    '',
                    'Turn **showPointsOfInterest** on to bring back the shops, stations and landmarks. It is off by',
                    'default so the only pins on the map are the records. Google is the one vendor whose tiles can',
                    'express this properly, through a map style, which is why this page opens on it; HERE',
                    'approximates it with a lower-detail style, and the raster tile services that cannot express it',
                    'at all ignore the property rather than pretending. Switch vendors with the toggle on to see',
                    'the difference.'
                ].join(' ')
            }
        }
    }
}
