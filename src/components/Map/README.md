# Map

Renders the records of a bound dataset as pins on a map. The **core** reads coordinates off the records,
decides what a pin looks like, decides where the map looks, and hands all of that to a **provider** that
draws it. Everything else is a **module** the host turns on by passing it in.

```tsx
import { Map, createClusteringModule, createRoutesModule } from '@talxis/base-controls';
import { googleMapsProvider } from '@talxis/base-controls/components/Map/providers/google-maps';

<Map
    context={pcfContext}
    parameters={{
        Dataset: dataset,
        LatitudeAttributeName: { raw: 'cds_addressid.cds_latitude' },
        LongitudeAttributeName: { raw: 'cds_addressid.cds_longitude' },
        GoogleApiKey: { raw: apiKey },
        DefaultProvider: { raw: 'google' }
    }}
    providers={[googleMapsProvider]}
    modules={{
        clustering: createClusteringModule(),
        routes: createRoutesModule({ attributes: { route: 'routeid', sequence: 'stopnumber' }, snapToRoads: true })
    }}
/>
```

A dataset and the two coordinate attributes are the only requirements. Without `providers` the map draws
keyless OpenStreetMap; without `modules` it draws pins, lets the user select them, and nothing else.

## The core

| Concern | Parameters |
|---|---|
| Binding | `Dataset`, `LatitudeAttributeName`, `LongitudeAttributeName`, `AutoAddLinkedColumns` |
| Which records | `LoadAllPages`, `MaxRecords` |
| Pin appearance | `PinRules`, plus the `onResolvePin` prop |
| Providers | `DefaultProvider`, `EnableProviderSwitching`, `MapProviderId`, `HereApiKey`, `MapyApiKey`, `GoogleApiKey`, `<Provider>ApiKey` |
| Chrome | `ShowPointsOfInterest` |

Every attribute parameter accepts dot notation across a lookup. Where the dataset does not carry the linked
column the core adds it, hidden, unless `AutoAddLinkedColumns` is off.

Outputs: `Viewport`, reported on pan and zoom; `MapProviderId`, the provider the end user picked.

## Modules

| Key | Built by | What it adds |
|---|---|---|
| `filter` | `createFilterModule` | A panel of the values the records hold, to narrow the pins by |
| `geocoding` | `createGeocodingModule` | Places records with an address but no coordinates |
| `routes` | `createRoutesModule` | Lines through pins sharing a value, optionally snapped to roads |
| `clustering` | `createClusteringModule` | Overlapping pins drawn as one, with a count |
| `editing` | `createEditingModule` | Move a record by dragging its pin, create one by clicking the map |
| `cards` | `createCardsModule` | What a pin opens |
| `search` | `createSearchModule` | Quick find over the records, and places from the geo-coding service |
| `legend` | `createLegendModule` | A legend over the map |
| `userLocation` | `createUserLocationModule` | Centre on the user while there is nothing else to show |
| `clientApi` | `createClientApiModule` | A Client API web resource deciding pin appearance |

A module is a set of optional stage hooks the core runs in a fixed order - see `modules/interfaces.ts`.
Each module owns its options, its strings and its UI, and ships with its own story and tests. Because the
stages are React hooks, the set of modules must not change while the control is mounted; a changed set
remounts the map.

## Providers

| Provider | Id | Renders | Geo-codes | Snaps routes to roads | Hides points of interest |
|---|---|:-:|:-:|:-:|:-:|
| OpenStreetMap (default, keyless) | `leaflet` | ✅ | Nominatim | OSRM | — |
| HERE | `here` | ✅ | ✅ | ✅ | approximated |
| Mapy.com | `mapy` | ✅ | ✅ | ✅ | — |
| Google Maps | `google` | ✅ | ✅ | Routes API | ✅ |

Rendering, geo-coding and directions are three separate capabilities, and a provider missing one borrows it
from another configured provider. Google Maps is not built in because importing it pulls an optional peer
dependency; pass `googleMapsProvider` through `providers`. A provider of your own is an
`IMapProviderDefinition` whose `createProvider` returns a component taking `IMapProviderProps`.

## Where things are

```
Map.tsx          the core: records → pins → viewport → provider, with the modules run in between
interfaces.ts    IMap, IMapParameters, IMapOutputs
labels.ts        the core's strings
core/            what the core computes with, no React except its hooks
providers/       the provider seam and the shipped providers
modules/         one folder per module, each with its create<Name>Module
```
