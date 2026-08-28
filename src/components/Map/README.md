# Map

Renders the records of a bound dataset as pins on a map. The control owns everything that is not vendor
specific — reading coordinates off the dataset, grouping pins into routes, deciding where the map should look,
translating pin clicks into dataset selection. Drawing is delegated to a **provider**.

| Vendor | Id | Factory | API key parameter | Extra dependency |
|--------|----|---------|:-----------------:|:----------------:|
| **OpenStreetMap** (default) | `leaflet` | `createLeafletMapProvider` | — keyless | — |
| HERE | `here` | `createHereMapsProvider` | `HereApiKey` | — |
| Mapy.com | `mapy` | `createMapyProvider` | `MapyApiKey` | — |
| Google Maps | `google` | `createGoogleMapsProvider` | `GoogleApiKey` | `@vis.gl/react-google-maps` |

Every one can be configured from a PCF manifest — an api key, a default vendor, whether the end user may
switch between them — or built in code and handed to the control directly. HERE and Mapy.com are REST raster
tile services, so both are drawn by the same Leaflet renderer as the default and need nothing installed beyond
a key. Google Maps brings an SDK, which is why it alone stays out of the package barrel and is
[registered by the host](#letting-a-maker-choose-in-pcf).

Anything else — Azure Maps, Mapbox, an internal tile server — is a provider you
[write yourself](#providers) against the contract below, plus optionally a
[vendor descriptor](#adding-a-vendor) so it configures from a manifest just like the four above.

---

## Usage

A dataset and the coordinate attributes are the only requirements — the control falls back to its own keyless
Leaflet/OpenStreetMap provider:

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

### Supplying providers in code

`onGetMapProviders` takes the vendor list over with providers of your own. Parameters, outputs, selection,
routes and the viewport behave identically across vendors, so a swap touches nothing else:

```tsx
const providers = useMemo(() => [
    { id: 'osm', label: 'OpenStreetMap', provider: createLeafletMapProvider() },
    { id: 'here', label: 'HERE', provider: createHereMapsProvider({ apiKey: hereApiKey }) }
], [hereApiKey]);

<Map
    context={context}
    parameters={{ ...parameters, MapProviderId: { raw: preferredProviderId } }}
    onGetMapProviders={() => providers}
    onNotifyOutputChanged={(outputs) => outputs.MapProviderId && persist(outputs.MapProviderId)}
/>
```

- **The id is the identity of the provider, config included.** The control caches the component under it, so
  the list may be rebuilt on every render without remounting the map — but a provider whose config changed
  needs a new id to be picked up.
- The picker appears from **two** options up, so a one-entry list is how you supply a single provider.
- `MapProviderId` names the provider the map opens with; the end user's pick comes back as the output of the
  same name. Persist it and feed it back to make it stick. Rewriting the parameter afterwards overrides their
  pick, so a host that does not want that must leave it alone.
- An id that is not on the list — a vendor whose key the maker cleared, say — falls back to the first option.
- Api keys never reach the control here, staying closed over in the factory. That is a property of this
  pattern, not a rule the control enforces: the manifest path below hands the keys over by design.
- The list *replaces* the manifest-configured vendors. To offer a provider of your own *alongside* them,
  describe it as a [vendor](#adding-a-vendor) instead.

A deliberate switch does remount, since a different vendor is a different map instance, but the control hands
the new one the viewport the old one last reported, so the user is not pulled back to the pins.

### Letting a maker choose in PCF

`LetUserSwitch`, `DefaultVendor` and the `<Vendor>ApiKey` properties are resolved by the control itself. They
are the whole vendor configuration of a wrapper, and none of them needs vendor-specific code behind it — see
[Manifest](#manifest) for the declarations.

- A vendor is offered as soon as its api key has a value, and not before. OpenStreetMap is keyless, so it is
  always on the list.
- `LetUserSwitch` (**on by default**) offers that list through the picker. Off, the control draws
  `DefaultVendor` alone, with no picker at all.
- `DefaultVendor` (**`leaflet` by default**) is the vendor the map opens with. An id with no configured vendor
  behind it falls back to `leaflet` and logs a warning rather than failing silently.
- Bind the keys to [Environment Variables](https://learn.microsoft.com/power-apps/maker/data-platform/environmentvariables)
  and one compiled control ships to every project unchanged; only the values differ per solution.

Google Maps is the one vendor the wrapper has to name in code. `@vis.gl/react-google-maps` is an optional peer
dependency, and importing it from inside the control would put it in every consumer's build graph whether they
use Google Maps or not. So the *import* lives in the wrapper while the *key* stays in the manifest:

```tsx
import { googleMapsVendor } from '@talxis/base-controls/dist/components/Map/providers/google-maps';

//module scope: the list is data, but the identity may as well be stable
const vendors = [googleMapsVendor];

<Map
    context={context}
    parameters={{ ...context.parameters, Dataset: dataset }}
    onGetMapVendors={() => vendors}
    onNotifyOutputChanged={(outputs) => notifyOutputChanged(outputs)}
/>
```

That is the whole wrapper, for all four vendors: `context.parameters` forwards straight through. Registered
this way Google Maps is indistinguishable from a built-in vendor — it appears once `GoogleApiKey` has a value,
`DefaultVendor` can name it, and the picker lists it beside the rest.

> An api key configured as a manifest property is readable by anyone who can open the page. That is normal for
> browser keys, but only safe while the key is restricted to the origins allowed to use it — which is the
> customizer's job, not something the control can do for them.

### Adding a vendor

An `IMapVendor` is a descriptor, not a code path in the control. The control walks the vendor list, reads the
key each entry *names* off `parameters`, and offers the ones that are configured.

```ts
const azureMapsVendor: IMapVendor = {
    id: 'azure',                                // what DefaultVendor and MapProviderId carry
    label: 'Azure Maps',                        // shown in the picker
    apiKeyParameterName: 'AzureMapsApiKey',     // omit for a keyless vendor
    createProvider: (apiKey) => createAzureMapsProvider({ apiKey })
};

<Map context={context} parameters={parameters} onGetMapVendors={() => [azureMapsVendor]} />
```

Adding `AzureMapsApiKey` to the manifest is then the entire integration, and it is additive: a manifest that
does not declare the property configures no Azure Maps vendor and behaves exactly as before.

An entry reusing a built-in id replaces it in place, which is how a built-in gets relabelled
(`{ ...googleMapsVendor, label: 'Maps' }`) or reconfigured — an entry with `id: 'here'` and
`createProvider: (apiKey) => createHereMapsProvider({ apiKey, style: 'topo.day', darkStyle: 'topo.night' })`
puts HERE on the topographic style while still reading the standard `HereApiKey` parameter.

Vendors are plain data, so this list may be rebuilt on every render. The control caches the provider it builds
from a vendor per id **and api key**, so editing a key rebuilds that vendor's provider — and only that one.

---

## API

`interfaces.ts` is the reference — every entry below is documented there, in the place an editor shows it.
`parameters` is PCF-shaped throughout (a dataset, an `IProperty`, or a `{ raw }` wrapper); anything the host
supplies as code lives on the props instead, matching how `DatasetControl` takes `onGetControlComponent`.

### Props — `IMap`

| Prop | Type | Required | |
|------|------|:--------:|-|
| `context` | `IContext` | ✅ | The PCF context — user settings, and the theme. |
| `parameters` | `IMapParameters` | ✅ | Below. |
| `translations` | `IMapTranslations` | — | `mapProvider`, the picker's label. Reaches providers as `labels` too. |
| `state` | `ComponentFramework.Dictionary` | — | Part of `IControl`. **Ignored by this control.** |
| `onNotifyOutputChanged` | `(outputs: IMapOutputs) => void` | — | Fires on pan, zoom, and provider pick. |
| `onOverrideComponentProps` | `(props: IMapProviderProps) => IMapProviderProps` | — | Escape hatch to rewrite what the provider receives. Prefer passing your own provider. |
| `onGetMapVendors` | `() => IMapVendor[]` | — | Vendors on top of the built-in ones — [Adding a vendor](#adding-a-vendor). |
| `onGetMapProviders` | `() => IMapProviderOption[]` | — | A host-built list. **Takes the vendor list over** — [Supplying providers in code](#supplying-providers-in-code). |
| `onResolveFallbackLocation` | `(signal: AbortSignal) => Promise<IMapCoordinates \| null>` | — | Opt-in — [Fallback location](#fallback-location). |

### `parameters` — `IMapParameters`

Everything except `Dataset` and `ViewportOptions` is a static manifest input; every one but `Dataset` is
optional, and all of the text ones are `SingleLine.Text`.

| Parameter | Type | |
|-----------|------|-|
| `Dataset` | `IDataset` | **Required**, `data-set`. Records to draw as pins. Loading is the host's job — `DatasetControl` already does it. |
| `LatitudeAttributeName`<br>`LongitudeAttributeName` | `IStringProperty` | **Required.** Attributes holding a record's coordinates. |
| `RouteAttributeName` | `IStringProperty` | Attribute grouping pins into routes. Empty draws none. |
| `LetUserSwitch` | `Omit<ITwoOptionsProperty, 'attributes'>` | `TwoOptions`. Whether the picker offers every configured vendor. **Default `true`.** |
| `DefaultVendor` | `IStringProperty` | Vendor the map opens with. **Default `leaflet`**, which an unconfigured id falls back to as well, with a warning. |
| `HereApiKey`<br>`MapyApiKey`<br>`GoogleApiKey` | `IStringProperty` | Offers the matching vendor once set. Google Maps additionally needs the wrapper to register `googleMapsVendor`. |
| `<Vendor>ApiKey` | `IStringProperty` | Whatever key a vendor from `onGetMapVendors` names. Resolved by name, so a vendor added later is additive. |
| `MapProviderId` | `IStringProperty` | The end user's pick, not a configuration decision: reported as the output of the same name and honoured over `DefaultVendor`. Bind it to a field to make it stick. |
| `ViewportOptions` | `{ raw: IMapViewportOptions }` | Code only. Overrides `fallbackCenter`, `fallbackZoom`, `singleLocationZoom`, `approximateLocationZoom`, `padding`. |

### `outputs` — `IMapOutputs`

| Output | Type | |
|--------|------|-|
| `Viewport` | `IMapViewport` | What the provider is showing, reported on pan and zoom. Lets a host persist the view the user left the map in. |
| `MapProviderId` | `string` | The provider the end user picked. Feed it back through the parameter of the same name to make it stick. |

### Manifest

The whole wrapper surface, so no per-project code is needed:

```xml
<data-set name="Dataset" display-name-key="Dataset" />
<property name="LatitudeAttributeName" display-name-key="Latitude attribute"
          of-type="SingleLine.Text" usage="input" required="true" />
<property name="LongitudeAttributeName" display-name-key="Longitude attribute"
          of-type="SingleLine.Text" usage="input" required="false" />
<property name="RouteAttributeName" display-name-key="Route attribute"
          of-type="SingleLine.Text" usage="input" required="false" />
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
<property name="MapProviderId" display-name-key="Map provider"
          of-type="SingleLine.Text" usage="bound" required="false" />
```

---

## Providers

A provider is nothing more than a component that accepts `IMapProviderProps`:

```ts
export type IMapProvider = ComponentType<IMapProviderProps>;
```

The convention is to expose it through a `createXProvider(config)` factory closing over vendor-specific config
(api keys, tile urls, style ids). That config never reaches the shared contract, which is why adding a provider
needs no change to the control or its interfaces.

| | `IMapProviderOption` | `IMapVendor` |
|-|----------------------|--------------|
| Shape | `{ id, label?, provider }` | `{ id, label, apiKeyParameterName?, createProvider }` |
| Config comes from | the host, closed over in the factory | the manifest, read by parameter name |
| Passed through | `onGetMapProviders` | `onGetMapVendors` |
| Cached by | `id` — a changed config needs a new id | `id` **and** api key — a changed key rebuilds it |
| Effect on the vendor list | replaces it | extends it |

### What a provider receives

| Prop | Description |
|------|-------------|
| `locations` | Pins to draw, in dataset order. |
| `routes` | Lines to draw. Empty unless `RouteAttributeName` names an attribute. |
| `viewport` | Where to look — see [Viewport](#viewport). |
| `selectedLocationIds` | Ids currently selected in the bound dataset. Reflect the selection visually. |
| `context` | The host control's context. |
| `theme` | The host control's theme, so provider chrome matches the app (`theme.isInverted` for dark mode). |
| `labels` | The control's labels resolved for the current language. |
| `onLocationClick` | Call when the user activates a pin. The control selects the matching record. |
| `onViewportChange` | Call when the user pans or zooms. The control reports it as the `Viewport` output. |

Providers are expected to be thin. If you find yourself computing *what* to show rather than *how* to show it,
that logic probably belongs in the control so every provider benefits from it.

### Viewport

The control derives the viewport from the pins and hands the result over; providers apply it and never compute
their own.

```ts
getMapViewport(coordinates, options?) // -> { center, zoom, bounds?, padding }
```

- `bounds` is set only when there is more than one location. Fit them, keeping `padding` pixels free.
  Otherwise apply `center` and `zoom`.
- Apply the viewport when its **object identity** changes. The control holds the identity stable while the
  derived viewport is unchanged, so a refresh returning the same records does not pull the map back from
  wherever the user panned to.
- A provider mounted by a provider switch is handed the center and zoom the previous one last reported, so
  there is nothing extra to implement.

Note the asymmetry: the `bounds` a provider *reports back* is whatever rectangle the map is showing, so unlike
the derived one it is set regardless of how many pins produced it.

### Layout and sizing

A map has no content to be sized by, so it can never let the host size it — it fills the box it was given. The
control and every shipped provider follow the
[responsive PCF](https://dev.azure.com/thenetworg/INT0015/_wiki/wikis/INT0015.wiki/4562/Responsive-PCF's)
layout chain: each element between the PCF container and the map is a flex column allowed to shrink, and the
map takes what is left.

```css
/* the control root, and every provider container between it and the map */
display: flex;  flex-direction: column;  flex-grow: 1;  min-width: 0;  min-height: 0;

/* the element the map is drawn into */
flex: 1;  min-width: 0;  min-height: 0;
```

`MAP_PROVIDER_LAYOUT` (`providers/layout`) holds exactly that, as `container` and `map` style fragments a
provider composes into its own style set. Two things matter when embedding the control:

- **The chain has to be unbroken.** A host wrapping the control in an element of its own has to give that
  element the same properties, or the map has nothing to grow into. In Power Apps that includes
  `document.querySelector('[data-control-name]').parentElement`, which needs `flex-direction: column`.
- **There is a floor, not a default.** The root keeps `min-height: 200px` for a host that hands the control no
  usable height at all — typically a field bound to a single-line attribute. It also honours `height: 100%`, so
  a host sizing by height rather than by flex needs nothing extra.

### Routes and selection

Setting `RouteAttributeName` groups records sharing the same non-empty value of that attribute into one
`IMapRoute`, ordered the way the dataset returns them. Routes of fewer than two pins are dropped. A provider
draws each as a single line through `route.locations`.

`onLocationClick` sets the dataset selection, which comes back as `selectedLocationIds` — so selection stays in
sync with any other control bound to the same dataset. What a selection *looks like* is a control decision:
`useMapPinSelection` (`providers/pinStyle`) turns `selectedLocationIds` into `getOpacity(location)` and
`isSelected(location)`, so every provider dims the pins outside the selection identically.

### Fallback location

With no pins and no `onResolveFallbackLocation`, the map shows `ViewportOptions.raw.fallbackCenter`. A host that
wants something closer to the user can pass a resolver:

```tsx
import { resolveLocationFromIpAddress } from '@talxis/base-controls/dist/components/Map';

<Map context={pcfContext} parameters={parameters} onResolveFallbackLocation={resolveLocationFromIpAddress} />
```

`resolveLocationFromIpAddress` calls the public **geojs.io** service. It is opt-in precisely because it is a
third-party request: hosts under a Content Security Policy or a privacy review are never making it
unknowingly. Any function of the same shape works, so a host can resolve the location from its own backend
instead. The control debounces the call, so a fast-loading dataset skips it entirely.

---

## The shipped providers

### Leaflet (default)

`leaflet` and `react-leaflet` are regular dependencies, because the default has to work out of the box. The
provider imports `leaflet/dist/leaflet.css` itself and draws its pins as inline SVG, so there are no image
assets to configure and the pin takes its color from `theme.palette.themePrimary`. The package is marked
`sideEffects: false`, so if tiles ever render misaligned in a host with aggressive tree-shaking, import
`leaflet/dist/leaflet.css` from the host as well.

The default tiles come from the **public OpenStreetMap servers**, which are fine for development but have a
[usage policy](https://operations.osmfoundation.org/policies/tiles/) production apps should not rely on. Point
the provider at your own tile server instead:

```tsx
import { createLeafletMapProvider } from '@talxis/base-controls/dist/components/Map/providers/leaflet';

const mapProvider = createLeafletMapProvider({
    tileLayerUrl: 'https://tiles.example.com/{z}/{x}/{y}.png',
    attribution: '&copy; Example'
});
```

`ILeafletMapConfig` also takes `minZoom`, `maxZoom`, `invertTilesInDarkTheme` and an `overlay` node — the seam
HERE and Mapy.com are built on. Pass a resolver instead of a config object for tiles that depend on the theme.

> `react-leaflet@3` requires React 17. The package declares React 16.8+ as a peer, so a host still on React 16
> has to pass a provider of its own rather than use the default.

### HERE

Backed by the [HERE Raster Tile API v3](https://www.here.com/docs/category/raster-tile-api-v3). The tiles are
plain XYZ raster images, so there is no HERE SDK to install — an api key from a project on the
[HERE platform](https://www.here.com/developer) is the whole setup.

```tsx
import { createHereMapsProvider } from '@talxis/base-controls/dist/components/Map/providers/here-maps';

const mapProvider = createHereMapsProvider({ apiKey: '...' });
```

| Config | Default | |
|--------|---------|-|
| `apiKey` | — | **Required.** A query parameter on every tile request, so restrict it by origin. |
| `style` / `darkStyle` | `explore.day` / `explore.night` | Style per control theme. |
| `resource` | `base` | `base` \| `background` \| `blank` \| `label` — which layer a tile carries. |
| `format` | `png8` | `png` \| `png8` \| `jpeg`. Prefer `jpeg` for satellite. |
| `size` | `512` | `256` \| `512` — the retina option, not a zoom shift. |
| `ppi` | `100` | `100` \| `200` \| `400`. Scales up labels and road widths. |
| `lang` | HERE default | BCP 47 tag for the labels, e.g. `cs-CZ`. |
| `attribution` | `© <year> HERE` | Required by HERE's terms. Reword or extend, do not remove. |

**This is the one shipped provider with a real dark map.** It follows the control theme by swapping `style` for
`darkStyle` rather than CSS-inverting the tiles. `explore.*`, `lite.*`, `logistics.*` and `topo.*` all have day
and night variants; `satellite.day` and `dem` do not. The authoritative list for a given key is whatever
`GET https://maps.hereapi.com/v3/info` returns — `IHereMapsStyle` mirrors it at the time of writing.

### Mapy.com

Backed by the [Mapy.com Map Tiles API](https://developer.mapy.com/rest-api-mapy-cz/function/map-tiles/), which
has the best coverage of Czechia and Slovakia of the four. Also plain XYZ raster tiles, so again nothing to
install beyond an api key from the [Mapy.com developer portal](https://developer.mapy.com/).

```tsx
import { createMapyProvider } from '@talxis/base-controls/dist/components/Map/providers/mapy';

const mapProvider = createMapyProvider({ apiKey: '...', mapset: 'outdoor' });
```

| Config | Default | |
|--------|---------|-|
| `apiKey` | — | **Required.** A query parameter on every tile request, so restrict it by origin. |
| `mapset` | `basic` | `basic` \| `outdoor` \| `winter` \| `aerial` \| `names-overlay`. |
| `retinaTiles` | `true` | Tiles at twice the resolution. Only `basic` and `outdoor` are served that way. |
| `lang` | `cs` | Tile label language. Only affects zoom 6 and below — country and region names. |

**The provider carries the attribution their licence requires**, so a host cannot forget it: a visible,
clickable logo at least 30px tall linking to mapy.com, plus a copyright notice linking to their copyright page.

They have no dark map set, so a dark control theme filters the tiles the way the OpenStreetMap default does.
The exception is `aerial`: inverting photography produces a negative rather than a dark map, so it is left
alone.

### Google Maps

Neither `createGoogleMapsProvider` nor `googleMapsVendor` is re-exported from the package barrel — both live
behind their own entry point, and `@vis.gl/react-google-maps` is an *optional* peer dependency, so consumers
who stay on the default never install a Google Maps SDK wrapper they do not load:

```bash
npm install @vis.gl/react-google-maps
```

```ts
import { createGoogleMapsProvider, googleMapsVendor } from '@talxis/base-controls/dist/components/Map/providers/google-maps';
```

`googleMapsVendor` is the descriptor that lets the control configure Google Maps from the `GoogleApiKey`
parameter, exactly like the other three vendors — pass it through `onGetMapVendors`. `createGoogleMapsProvider`
is the factory behind it, for a host that builds the provider itself.

A provider that brings an SDK should follow the same shape — its own entry point, its own optional peer
dependency — so the barrel stays free of vendor SDKs.
