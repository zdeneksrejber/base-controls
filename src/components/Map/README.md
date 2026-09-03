# Map

Renders the records of a bound dataset as pins on a map. The control owns everything that is not vendor
specific — reading coordinates off the dataset, geo-coding the ones that have none, grouping pins that
overlap, deciding what a pin looks like and what it opens, connecting pins into lines, and deciding where the
map should look. Drawing is delegated to a **provider**.

| Vendor | Id | Renders | Geo-codes | Snaps routes to roads | Hides points of interest |
|--------|----|:-------:|:---------:|:---------------------:|:------------------------:|
| **OpenStreetMap** (default, keyless) | `leaflet` | ✅ | Nominatim | OSRM | — |
| HERE | `here` | ✅ | ✅ | ✅ | approximated |
| Mapy.com | `mapy` | ✅ | ✅ | ✅ | — |
| Google Maps | `google` | ✅ | ✅ | Routes API | ✅ |

Rendering, geo-coding and directions are **three separate capabilities**, and no vendor has to offer all
three. A provider missing one borrows it from another configured vendor rather than the feature switching
off, so a Mapy.com map can geo-code through HERE if that key is set.

Everything is configured from a PCF manifest. Nothing below needs per-project code except registering the
Google Maps vendor and the Adaptive Card renderer, both of which bring an optional dependency and therefore
stay behind their own entry points.

---

## Usage

A dataset and the coordinate attributes are the only requirements — the control falls back to its own
keyless Leaflet/OpenStreetMap provider:

```tsx
import { Map } from '@talxis/base-controls';

<Map
    context={pcfContext}
    parameters={{
        Dataset: dataset,
        LatitudeAttributeName: { raw: 'lat' },
        LongitudeAttributeName: { raw: 'lng' }
    }}
/>
```

---

## Data

### Attributes across a link entity

Every parameter that names an attribute accepts **dot notation**, so a record whose coordinates live on a
related address row binds directly:

```xml
<property name="LatitudeAttributeName" ... /> <!-- cds_addressid.cds_latitude -->
```

The alias in the path is the alias of the link, and it is the lookup attribute the link is joined on. The
control reads the value whichever way the host supplied it: the flat aliased key Dataverse returns for a
link entity, or a nested object from an expand. Where the dataset carries neither, the control **adds the
link and the column itself**, hidden so a sibling control bound to the same dataset does not start showing
them. `EnableAttributeLinking` turns that off for a host that manages its own dataset.

### Which records are drawn

`PinLoading` is `page` by default, which draws what the host loaded. `all` drains every page of the view
first, on a **clone** of the data provider — so the dataset the rest of the app is bound to keeps its page,
and its pagination chrome keeps working. `MaxRecords` caps it (50 000 by default) and the control says when
it stopped short rather than quietly drawing a subset.

### Records with an address but no coordinates

`FullAddressAttributeName` names the attribute holding a record's address. A record the coordinate
attributes cannot place is placed by geo-coding it. Lookups are cached and de-duplicated, four run at a
time, `MaxGeocodingRequests` caps them, and an address the service cannot place is remembered as unplaceable
rather than asked about again.

### Thousands of pins

Pins that overlap in the current view are drawn as **one pin carrying the count**. The grouping is done in
the control, over the viewport, so all four vendors group identically and the provider only ever receives
what is inside the view — which is what makes a dataset of thousands usable. Clicking a grouped pin opens a
card listing the records behind it, with a button to zoom to where the group comes apart.

`EnableClustering` is on by default; `ClusteringOptions` overrides the radius, the zoom ceiling and how many
members a group lists.

### Filtering and searching

`FilterAttributeNames` puts a filter panel on the map, listing the values the loaded records actually hold
with a count each. Values within one attribute widen the result and attributes narrow it. `FilterMode` picks
where the filter lands: `pins` (the default) filters what the map draws and works on any provider, `dataset`
pushes an `In` expression to the bound dataset so every control sharing it follows.

`EnableSearch` puts a search box on the map. Committing what is typed runs the entity's **quick find**, the
same call the dataset control's own header makes. Typing also offers **places** from the geo-coding service,
and picking one moves the map without touching the dataset. It is off by default, because a map hosted
inside `DatasetControl` already has quick find in that control's header.

---

## Pins

### What a pin looks like

Three seams decide, tried in order — anything returning nothing falls through to the next, so code refines
configuration rather than replacing it:

1. **`onResolvePin`**, a prop, for a wrapper that computes the appearance in code.
2. **A Client API web resource**, named by `ClientApiWebresourceName` and `ClientApiFunctionName`, called
   once with the dataset and the registration methods — the same shape the dataset control's Client API
   uses, so a customizer writes one kind of web resource for both.
3. **`PinIcons`**, a JSON array of rules a maker types into the manifest.

```jsonc
[
    { "attributeName": "cds_category", "value": "depot", "color": "#c50f1f", "title": "Depot" },
    { "attributeName": "cds_category", "value": "service", "webResourceName": "ntg_service.svg" },
    { "color": "#0f6cbd" }
]
```

Rules are tried in order and the first match wins, so a rule with no `attributeName` is the fallback and
belongs last. This is the shape the legacy `MapPicker`'s `pinIcons` used, so an existing configuration
carries over, and the attribute goes through the same dot notation resolver as every other binding.

An appearance is a `color`, an image `url`, a `webResourceName` the host resolves, or `svg` markup — the
last of which is the custom renderer, and is how a pin becomes a chart:

```tsx
<Map
    context={context}
    parameters={parameters}
    onResolvePin={(record) => ({
        width: 34,
        height: 34,
        svg: getCapacityDonut(record.getValue('cds_capacity'))
    })}
/>
```

> `svg` is inserted as written. Author it in code; never build it out of values a user can type.

### What a pin opens

`Cards` is a JSON array matched exactly like `PinIcons`, so "depots open an Adaptive Card, service points run
a function" is one line of configuration:

| `type` | What happens |
|--------|--------------|
| `fields` | The record's attributes, plus whatever buttons the card was given. The default. |
| `adaptiveCard` | An Adaptive Card template in `payload`. Needs the renderer registered — see below. |
| `function` | Nothing is shown; the web resource in `webResourceName`/`functionName` runs instead. |
| `none` | The pin only selects its record. |

`CardType`, `CardColumns` and `CardPayload` configure the card every pin opens when no rule matches. **One
card is open at a time**, which the control enforces by holding a single open pin rather than by asking
providers to close each other's.

A card's buttons — and an Adaptive Card's `Action.Submit` carrying `webResourceName` and `functionName` —
run through `ExecuteFunction`.

#### Adaptive Cards

`adaptivecards` and `adaptivecards-templating` are **optional peer dependencies**, so a consumer rendering
cards from record columns never installs a card engine they do not use:

```bash
npm install adaptivecards adaptivecards-templating
```

```tsx
import { ADAPTIVE_MAP_CARD_RENDERERS } from '@talxis/base-controls/dist/components/Map/map-card/adaptive-card';

<Map context={context} parameters={parameters} onGetCardRenderers={() => ADAPTIVE_MAP_CARD_RENDERERS} />
```

The record's data is copied with its formatted value annotations renamed before the template is expanded:
`statecode@OData.Community.Display.V1.FormattedValue` becomes `statecode_label`, bindable as
`${$root.statecode_label}`. No Adaptive Cards binding expression can address a key containing `@` or `.`,
which is why the legacy `MapPicker` did the same — so an existing template binds unchanged. The copy is the
difference: rendering a card never touches the dataset.

> **Bundler note.** `adaptivecards-templating` parses expressions with `adaptive-expressions`, which uses
> `antlr4ts`, which calls Node's `assert`. That chain does not survive Vite's dependency optimizer. Rather
> than let a card fail to render because of where it was bundled, the control falls back to substituting the
> simple `${...}` bindings and says so once in the console. The full language — repetition, conditions,
> functions — runs wherever the engine does, which includes webpack and rollup.

---

## Pin connections

`RouteAttributeName` groups pins sharing a value into one line. `RouteSequenceAttributeName` orders each
line — a numeric sequence sorts as numbers, so stop 10 follows stop 9 — and `RouteColorAttributeName`
colours it. A run of fewer than two pins is not a line and is dropped.

`SnapRoutesToRoads` asks the active directions service for the real path. It is optional in every sense: a
control that does not ask for it draws straight lines, a vendor with no directions service leaves them
straight, and a single run the service cannot resolve stays straight while the others are snapped. Long runs
are split at each service's own stop limit and rejoined without repeating the shared stop.

---

## Editing

Both gestures are **off by default**, because a map that moves records when a finger slips is worse than one
that does not move them at all.

- `EnablePinDragging` writes a dropped pin's coordinates back to its record and saves it.
- `EnablePinCreation` turns a click on empty map into a new record in the bound dataset. A record the map
  created carries a **Delete** button on its own card.

Where any of the nine address attributes is bound, either gesture also reverse geo-codes the point and
writes the components back — which is what makes a map click a usable way to fill in an address:

`FullAddressAttributeName` · `CountryAttributeName` · `AdministrativeAreaAttributeName` ·
`LocalityAttributeName` · `SublocalityAttributeName` · `StreetAttributeName` · `StreetNameAttributeName`
(street and number together) · `StreetNumberAttributeName` · `PostalCodeAttributeName`

A component the service could not resolve is written as empty rather than skipped, so moving a pin out of a
street clears the street instead of leaving the old one behind.

`PrefillUserLocation` centres an empty map on the user. The browser is asked first, because it is the only
source precise enough to drop a pin on; a user who declines falls through to `onResolveFallbackLocation`.

---

## Legend

`Legend` takes markup and shows it over the map, collapsible. `LegendWebResourceName` loads the same markup
from a web resource instead and wins once it does, so a legend moves out of the manifest without anything
else changing.

This is the one place the Map renders markup it did not write, so it is cleaned first with DOMPurify:
its HTML and SVG profiles, `style` explicitly allowed because a legend is mostly colour swatches, forms and
embeds forbidden, unknown protocols rejected, and every surviving link rewritten to open detached from the
app. Cleaning happens in the control, so nothing downstream ever holds markup that has not been through it.

---

## Points of interest

`ShowPointsOfInterest` is **off by default**, so the only pins on the map are the records. Google is the one
vendor whose tiles can express this properly, through a map style. HERE approximates it with a lower detail
style — configurable through `lowPoiStyle` and `lowPoiDarkStyle`. The raster tile services that cannot
express it ignore the property rather than pretending to.

---

## Providers

A provider is a component that accepts `IMapProviderProps`:

```ts
export type IMapProvider = ComponentType<IMapProviderProps>;
```

Providers are expected to be **thin renderers**. Clustering, geo-coding, expression evaluation, card
rendering and the legend all live in the control, so a provider for a new raster tile service is a tile url
and whatever chrome its licence asks for. If you find yourself computing *what* to show rather than *how*,
that logic probably belongs in the control so every provider benefits from it.

### Letting a maker choose in PCF

`LetUserSwitch`, `DefaultVendor` and the `<Vendor>ApiKey` properties are resolved by the control itself.

- A vendor is offered as soon as its api key has a value. OpenStreetMap is keyless, so it is always offered.
- `LetUserSwitch` (**on by default**) offers that list through the picker. Off, the control draws
  `DefaultVendor` alone, with no picker.
- `DefaultVendor` (**`leaflet` by default**) is the vendor the map opens with. An id with no configured
  vendor behind it falls back to `leaflet` and warns rather than failing silently.
- `MapProviderId` carries the end user's pick and comes back as the output of the same name. Persist it and
  feed it back to make it stick.
- A deliberate switch remounts the map, but the new provider is handed the view the old one last reported,
  so the user is not pulled back to the pins.

Google Maps is the one vendor the wrapper has to name in code, because importing it is what pulls the
optional `@vis.gl/react-google-maps` peer dependency into the build:

```tsx
import { googleMapsVendor } from '@talxis/base-controls/dist/components/Map/providers/google-maps';

//module scope: the list is data, but the identity may as well be stable
const vendors = [googleMapsVendor];

<Map context={context} parameters={context.parameters} onGetMapVendors={() => vendors} />
```

> An api key configured as a manifest property is readable by anyone who can open the page. That is normal
> for browser keys, but only safe while the key is restricted to the origins allowed to use it — which is
> the customizer's job, not something the control can do for them.

### Adding a vendor

An `IMapVendor` is a descriptor, not a code path in the control. The control walks the vendor list, reads
the key each entry *names* off `parameters`, and offers the ones that are configured:

```ts
const azureMapsVendor: IMapVendor = {
    id: 'azure',
    label: 'Azure Maps',
    apiKeyParameterName: 'AzureMapsApiKey',
    createProvider: (apiKey) => createAzureMapsProvider({ apiKey }),
    //both optional - a vendor with neither still renders
    createGeocoder: (apiKey) => createAzureMapsGeocoder(apiKey),
    createDirections: (apiKey) => createAzureMapsDirections(apiKey)
};

<Map context={context} parameters={parameters} onGetMapVendors={() => [azureMapsVendor]} />
```

Adding `AzureMapsApiKey` to the manifest is then the entire integration, and it is additive. An entry
reusing a built-in id replaces it in place, which is how a built-in gets relabelled or reconfigured.

Vendors are plain data, so the list may be rebuilt on every render — the control caches the provider it
builds per id **and** api key, so editing a key rebuilds that vendor alone.

### Supplying providers in code

`onGetMapProviders` takes the vendor list over entirely, with providers of your own:

```tsx
const providers = useMemo(() => [
    { id: 'osm', label: 'OpenStreetMap', provider: createLeafletMapProvider(), geocoder: createNominatimGeocoder() },
    { id: 'here', label: 'HERE', provider: createHereMapsProvider({ apiKey }), geocoder: createHereMapsGeocoder(apiKey) }
], [apiKey]);
```

**The id is the identity of the provider, config included.** The control caches under it, so the list may be
rebuilt every render — but a provider whose config changed needs a new id to be picked up. The picker appears
from **two** options up.

### Geo services

```ts
interface IMapGeocoder {
    geocode(query: string, options?: IMapGeocodingOptions): Promise<IMapPlace[]>;
    reverseGeocode(coordinates: IMapCoordinates, options?: IMapGeocodingOptions): Promise<IMapPlace | null>;
}

interface IMapDirections {
    readonly maxStops: number;
    getRoute(stops: IMapCoordinates[], options?: IMapDirectionsOptions): Promise<IMapRoutePath | null>;
}
```

A resolved place carries its address as **`IAddress`**, the shape `@talxis/client-libraries` already uses —
so the components the pin editing writes back need no translation layer.

The shipped geocoders are `createGoogleMapsGeocoder`, `createHereMapsGeocoder`, `createMapyGeocoder` and
`createNominatimGeocoder`; the directions services are `createGoogleMapsDirections`,
`createHereMapsDirections`, `createMapyDirections` and `createOsrmDirections`. Every one caches, shares an
in-flight lookup rather than duplicating it, and forgets a failure rather than caching it.

> **Nominatim and OSRM are public services with usage policies.** The client holds Nominatim to its one call
> a second and identifies the application on every request, because it refuses a caller it cannot attribute.
> Point them at your own instances for anything but development — `createNominatimGeocoder({ searchUrl,
> reverseUrl })` and `createOsrmDirections({ baseUrl })` — the same caveat the OpenStreetMap tiles carry.

`npm run test:live` calls all of them against the real services, with keys from the environment.

---

## API

`interfaces.ts` is the reference — every entry is documented there, in the place an editor shows it.
`parameters` is PCF-shaped throughout; anything the host supplies as code lives on the props instead.

### Props — `IMap`

| Prop | Type | |
|------|------|-|
| `context` | `IContext` | **Required.** The PCF context — user settings, and the theme. |
| `parameters` | `IMapParameters` | **Required.** Below. |
| `translations` | `IMapTranslations` | Overrides any of the control's labels. Reaches providers as `labels` too. |
| `onNotifyOutputChanged` | `(outputs: IMapOutputs) => void` | Fires on pan, zoom, and provider pick. |
| `onOverrideComponentProps` | `(props: IMapProviderProps) => IMapProviderProps` | Escape hatch. Prefer passing your own provider. |
| `onGetMapVendors` | `() => IMapVendor[]` | Vendors on top of the built-in ones. |
| `onGetMapProviders` | `() => IMapProviderOption[]` | A host-built list. **Takes the vendor list over.** |
| `onGetCardRenderers` | `() => IMapCardRenderers` | Card renderers on top of the built-in ones. |
| `onResolvePin` | `(record: IRecord) => IMapPinAppearance \| undefined` | Decides a pin's appearance in code. |
| `onResolveFallbackLocation` | `(signal: AbortSignal) => Promise<IMapCoordinates \| null>` | Opt-in. |

### `parameters` — `IMapParameters`

`Dataset` is a `data-set`; `ViewportOptions` and `ClusteringOptions` are code only; everything else is a
static manifest input, and every one but `Dataset`, `LatitudeAttributeName` and `LongitudeAttributeName` is
optional.

| Group | Parameters |
|-------|------------|
| **Binding** | `Dataset`, `LatitudeAttributeName`, `LongitudeAttributeName`, `EnableAttributeLinking` |
| **Data** | `PinLoading`, `MaxRecords`, `FullAddressAttributeName`, `MaxGeocodingRequests`, `EnableClustering`, `ClusteringOptions`, `FilterAttributeNames`, `FilterMode`, `EnableSearch`, `EnableAddressSearch` |
| **Pins** | `PinIcons`, `ClientApiWebresourceName`, `ClientApiFunctionName` |
| **Cards** | `Cards`, `CardType`, `CardColumns`, `CardPayload` |
| **Connections** | `RouteAttributeName`, `RouteSequenceAttributeName`, `RouteColorAttributeName`, `SnapRoutesToRoads` |
| **Editing** | `EnablePinDragging`, `EnablePinCreation`, `PrefillUserLocation`, and the nine address attributes |
| **Chrome** | `Legend`, `LegendWebResourceName`, `ShowPointsOfInterest` |
| **Providers** | `LetUserSwitch`, `DefaultVendor`, `MapProviderId`, `HereApiKey`, `MapyApiKey`, `GoogleApiKey`, `<Vendor>ApiKey` |
| **Viewport** | `ViewportOptions` |

### `outputs` — `IMapOutputs`

| Output | Type | |
|--------|------|-|
| `Viewport` | `IMapViewport` | What the provider is showing, reported on pan and zoom. |
| `MapProviderId` | `string` | The provider the end user picked. Feed it back to make it stick. |

### Manifest

```xml
<data-set name="Dataset" display-name-key="Dataset" />

<!-- binding -->
<property name="LatitudeAttributeName" display-name-key="Latitude attribute" of-type="SingleLine.Text" usage="input" required="true" />
<property name="LongitudeAttributeName" display-name-key="Longitude attribute" of-type="SingleLine.Text" usage="input" required="true" />
<property name="FullAddressAttributeName" display-name-key="Address attribute" of-type="SingleLine.Text" usage="input" required="false" />

<!-- data -->
<property name="PinLoading" display-name-key="Pins to draw" of-type="Enum" usage="input" required="false">
    <value name="page" display-name-key="Loaded page" default="true">page</value>
    <value name="all" display-name-key="Every page">all</value>
</property>
<property name="MaxRecords" display-name-key="Maximum records" of-type="Whole.None" usage="input" required="false" />
<property name="EnableClustering" display-name-key="Group overlapping pins" of-type="TwoOptions" usage="input" required="false" />
<property name="FilterAttributeNames" display-name-key="Filter attributes" of-type="SingleLine.Text" usage="input" required="false" />
<property name="EnableSearch" display-name-key="Show the search box" of-type="TwoOptions" usage="input" required="false" />

<!-- pins and cards -->
<property name="PinIcons" display-name-key="Pin rules" of-type="Multiple" usage="input" required="false" />
<property name="Cards" display-name-key="Card rules" of-type="Multiple" usage="input" required="false" />
<property name="CardColumns" display-name-key="Card columns" of-type="SingleLine.Text" usage="input" required="false" />
<property name="ClientApiWebresourceName" display-name-key="Client API web resource" of-type="SingleLine.Text" usage="input" required="false" />
<property name="ClientApiFunctionName" display-name-key="Client API function" of-type="SingleLine.Text" usage="input" required="false" />

<!-- connections -->
<property name="RouteAttributeName" display-name-key="Route attribute" of-type="SingleLine.Text" usage="input" required="false" />
<property name="RouteSequenceAttributeName" display-name-key="Route sequence attribute" of-type="SingleLine.Text" usage="input" required="false" />
<property name="RouteColorAttributeName" display-name-key="Route colour attribute" of-type="SingleLine.Text" usage="input" required="false" />
<property name="SnapRoutesToRoads" display-name-key="Snap routes to roads" of-type="TwoOptions" usage="input" required="false" />

<!-- editing -->
<property name="EnablePinDragging" display-name-key="Allow dragging pins" of-type="TwoOptions" usage="input" required="false" />
<property name="EnablePinCreation" display-name-key="Allow creating pins" of-type="TwoOptions" usage="input" required="false" />
<property name="PrefillUserLocation" display-name-key="Prefill the user location" of-type="TwoOptions" usage="input" required="false" />
<property name="LocalityAttributeName" display-name-key="City attribute" of-type="SingleLine.Text" usage="input" required="false" />
<!-- ... and the other seven address attributes -->

<!-- chrome and providers -->
<property name="Legend" display-name-key="Legend" of-type="Multiple" usage="input" required="false" />
<property name="LegendWebResourceName" display-name-key="Legend web resource" of-type="SingleLine.Text" usage="input" required="false" />
<property name="ShowPointsOfInterest" display-name-key="Show points of interest" of-type="TwoOptions" usage="input" required="false" />
<property name="LetUserSwitch" display-name-key="Let user switch map" of-type="TwoOptions" usage="input" required="false" />
<property name="DefaultVendor" display-name-key="Default map vendor" of-type="SingleLine.Text" usage="input" required="false" />
<property name="HereApiKey" display-name-key="HERE api key" of-type="SingleLine.Text" usage="input" required="false" />
<property name="MapyApiKey" display-name-key="Mapy.com api key" of-type="SingleLine.Text" usage="input" required="false" />
<property name="GoogleApiKey" display-name-key="Google Maps api key" of-type="SingleLine.Text" usage="input" required="false" />
<property name="MapProviderId" display-name-key="Map provider" of-type="SingleLine.Text" usage="bound" required="false" />
```

---

## What a provider receives

| Prop | Description |
|------|-------------|
| `locations` | Pins to draw. A pin standing for a group carries `cluster`; one with a resolved appearance carries `pin`. |
| `routes` | Lines to draw. `path` is the road-following line where one was resolved, `color` the route's colour. |
| `viewport` | Where to look — see below. |
| `selectedLocationIds` | Ids currently selected in the bound dataset. Reflect the selection visually. |
| `openCard` | The one open card: where to anchor it, and what to render. The control decides its content. |
| `showPointsOfInterest` | Whether to draw the vendor's own points of interest. Ignore it where the tiles cannot. |
| `isPinDraggable` | Whether a given pin may be dragged. |
| `context`, `theme`, `labels` | The host control's context, theme (`theme.isInverted` for dark mode) and resolved labels. |
| `onLocationClick` | Call when a pin is activated. |
| `onViewportChange` | Call when the user pans or zooms. |
| `onCloseCard` | Call when the user dismisses the open card. |
| `onLocationDragEnd` | Call when a pin is dropped. |
| `onMapClick` | Call when the user clicks empty map. Absent means do not offer it. |

### Viewport

The control derives the viewport from the pins and hands the result over; providers apply it and never
compute their own.

```ts
getMapViewport(coordinates, options?) // -> { center, zoom, bounds?, padding }
```

- `bounds` is set only when there is more than one location. Fit them, keeping `padding` pixels free.
  Otherwise apply `center` and `zoom`.
- Apply the viewport when its **object identity** changes. The control holds the identity stable while the
  derived viewport is unchanged, so a refresh returning the same records does not pull the map back from
  wherever the user panned to.
- **Never apply a viewport to a map the browser has not laid out.** Leaflet measures its container once, at
  creation, and a map built at zero width computes `NaN` from it for the rest of its life. The shipped
  renderer observes its container, re-measures on every change, and holds off until the map has a real size;
  `isFiniteMapViewport` guards what goes in and what comes back out.

### Layout and sizing

A map has no content to be sized by, so it can never let the host size it — it fills the box it was given.
The control and every shipped provider follow the
[responsive PCF](https://dev.azure.com/thenetworg/INT0015/_wiki/wikis/INT0015.wiki/4562/Responsive-PCF's)
layout chain: each element between the PCF container and the map is a flex column allowed to shrink, and the
map takes what is left.

```css
/* the control root, and every provider container between it and the map */
display: flex;  flex-direction: column;  flex-grow: 1;  min-width: 0;  min-height: 0;

/* the element the map is drawn into */
flex: 1;  min-width: 0;  min-height: 0;
```

`MAP_PROVIDER_LAYOUT` (`providers/layout`) holds exactly that. Two things matter when embedding the control:

- **The chain has to be unbroken.** A host wrapping the control in an element of its own has to give that
  element the same properties. In Power Apps that includes
  `document.querySelector('[data-control-name]').parentElement`, which needs `flex-direction: column`.
- **There is a floor, not a default.** The root keeps `min-height: 200px` for a host that hands the control
  no usable height at all, and honours `height: 100%` for one that sizes by height rather than by flex.

---

## The shipped providers

### Leaflet (default)

`leaflet` and `react-leaflet` are regular dependencies, because the default has to work out of the box. The
provider imports `leaflet/dist/leaflet.css` itself and draws its pins as inline SVG, so there are no image
assets to configure.

The default tiles come from the **public OpenStreetMap servers**, which are fine for development but have a
[usage policy](https://operations.osmfoundation.org/policies/tiles/) production apps should not rely on:

```tsx
createLeafletMapProvider({ tileLayerUrl: 'https://tiles.example.com/{z}/{x}/{y}.png', attribution: '&copy; Example' });
```

`ILeafletMapConfig` also takes `minZoom`, `maxZoom`, `invertTilesInDarkTheme` and an `overlay` node — the
seam HERE and Mapy.com are built on. Pass a resolver instead of a config object for tiles that depend on the
theme or on whether points of interest are wanted.

> `react-leaflet@3` requires React 17. The package declares React 16.8+ as a peer, so a host still on React
> 16 has to pass a provider of its own rather than use the default.

### HERE

Backed by the [HERE Raster Tile API v3](https://www.here.com/docs/category/raster-tile-api-v3) — plain XYZ
raster images, so an api key is the whole setup. **The one shipped provider with a real dark map**: it swaps
the HERE style rather than CSS-inverting the tiles. Geo-coding is the Geocoding and Search API v7, routing is
the Routing API v8.

### Mapy.com

Backed by the [Mapy.com Map Tiles API](https://developer.mapy.com/rest-api-mapy-cz/function/map-tiles/),
which has the best coverage of Czechia and Slovakia of the four. **The provider carries the attribution
their licence requires**, so a host cannot forget it: a visible, clickable logo linking to mapy.com plus a
copyright notice. They have no dark map set, so a dark control theme filters the tiles — except `aerial`,
because inverting photography produces a negative rather than a dark map.

### Google Maps

Neither `createGoogleMapsProvider` nor `googleMapsVendor` is re-exported from the package barrel — both live
behind their own entry point, and `@vis.gl/react-google-maps` is an *optional* peer dependency:

```bash
npm install @vis.gl/react-google-maps
```

Geo-coding is the Geocoding API. Directions are the **Routes API**, which is a separate api from the one
that draws the map: a project that has not enabled `routes.googleapis.com` answers 403, which the control
reports before falling back to a straight line.
