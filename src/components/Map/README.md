# Map

Renders the records of a bound dataset as pins on a map. The control owns everything that is not
map-vendor specific — reading coordinates off the dataset, grouping pins into routes, deciding where the map
should look, and translating pin clicks into dataset selection. Drawing is delegated to a **provider**.

Four vendors ship with the control:

| Vendor | Id | Factory | API key parameter | Extra dependency |
|--------|----|---------|:-----------------:|:----------------:|
| **OpenStreetMap** (default) | `leaflet` | `createLeafletMapProvider` | — keyless | — |
| HERE | `here` | `createHereMapsProvider` | `HereApiKey` | — |
| Mapy.com | `mapy` | `createMapyProvider` | `MapyApiKey` | — |
| Google Maps | `google` | `createGoogleMapsProvider` | `GoogleApiKey` | `@vis.gl/react-google-maps` |

Every one of them can be configured from a PCF manifest — an api key, a default vendor, and whether the end
user may switch between them — or built in code and handed to the control directly. HERE and Mapy.com are REST
raster tile services (plain XYZ tile images), so both are rendered by the same Leaflet renderer as the default
and need nothing installed beyond a key. Google Maps brings an SDK, which is why it alone stays out of the
package barrel and is [registered by the host](#letting-a-maker-choose-in-pcf).

Anything else — Azure Maps, Mapbox, an internal tile server — is a provider you write yourself against the
contract below, and optionally a [vendor descriptor](#adding-a-vendor) so it can be configured from a manifest
just like the four above. Neither touches this package.

---

## Usage

Nothing but a dataset and the coordinate attributes is required — the control falls back to its own keyless
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

Pass `onGetMapProvider` to use a different vendor:

```tsx
import { createGoogleMapsProvider } from '@talxis/base-controls/dist/components/Map/providers/GoogleMaps';

const mapProvider = createGoogleMapsProvider({ apiKey: '...' });

<Map
    context={pcfContext}
    parameters={{
        Dataset: dataset,
        LatitudeAttributeName: { raw: 'lat' },
        LongitudeAttributeName: { raw: 'lng' }
    }}
    onGetMapProvider={() => mapProvider}
/>
```

### Switching providers

The provider is the only thing that changes. Parameters, outputs, selection, routes and the viewport behave
identically across vendors, so a swap never touches the rest of the usage:

```tsx
// default — keyless Leaflet/OpenStreetMap, nothing to pass
<Map context={context} parameters={parameters} />

// Leaflet against your own tile server
const mapProvider = useMemo(() => createLeafletMapProvider({ tileLayerUrl, attribution }), []);
<Map context={context} parameters={parameters} onGetMapProvider={() => mapProvider} />

// HERE
const mapProvider = useMemo(() => createHereMapsProvider({ apiKey }), [apiKey]);
<Map context={context} parameters={parameters} onGetMapProvider={() => mapProvider} />

// Mapy.com
const mapProvider = useMemo(() => createMapyProvider({ apiKey }), [apiKey]);
<Map context={context} parameters={parameters} onGetMapProvider={() => mapProvider} />

// Google Maps
const mapProvider = useMemo(() => createGoogleMapsProvider({ apiKey }), [apiKey]);
<Map context={context} parameters={parameters} onGetMapProvider={() => mapProvider} />
```

**Memoize the provider.** `onGetMapProvider` is called on every render and `createXProvider` returns a new
component each call, so returning a fresh identity remounts the map — losing the tiles and whatever the user
had panned to. Build it once with `useMemo` or a module constant and let the getter return that.

#### Choosing at runtime

Because the provider is picked in code, a host can decide per environment, per tenant or per user. Keep the
decision inside the memo so the identity changes only when the decision does:

```tsx
const mapProvider = useMemo(
    () => (googleMapsApiKey ? createGoogleMapsProvider({ apiKey: googleMapsApiKey }) : createLeafletMapProvider()),
    [googleMapsApiKey]
);
```

Switching at runtime does remount the map — a different vendor is a different map instance. The control hands
the new one the viewport the old one last reported, so the user keeps looking at what they were looking at
instead of being pulled back to the pins.

#### Letting the end user switch

Hand the control a *list* of providers instead of one and it renders a picker over the map, so the customizer
configures the vendors and the end user chooses between them:

```tsx
const providers = useMemo(() => [
    { id: 'osm', label: 'OpenStreetMap', provider: createLeafletMapProvider() },
    { id: 'here', label: 'HERE', provider: createHereMapsProvider({ apiKey: hereApiKey }) },
    { id: 'google', label: 'Google Maps', provider: createGoogleMapsProvider({ apiKey: googleApiKey }) }
], [hereApiKey, googleApiKey]);

<Map
    context={context}
    parameters={{ ...parameters, MapProviderId: { raw: preferredProviderId } }}
    onGetMapProviders={() => providers}
    onNotifyOutputChanged={(outputs) => outputs.MapProviderId && persist(outputs.MapProviderId)}
/>
```

- The picker only appears from **two** options up, so a one-entry list renders exactly like a single provider.
- `MapProviderId` names the provider the map opens with; the end user's pick comes back as the output of the
  same name. Persist it and feed it back to make it stick. Changing the parameter afterwards overrides their
  pick, so a host that does not want that must not rewrite it.
- An id that is not on the list — a vendor whose key the maker cleared, say — falls back to the first option.
- Built this way, api keys never reach the control - they stay closed over in the `createXProvider` factory,
  exactly as with `onGetMapProvider`. That is a property of this pattern, not a rule the control enforces: the
  manifest-driven path below hands the keys to the control directly, by design.
- This list replaces the manifest-configured vendors rather than adding to them. To offer a provider of your
  own *alongside* them, describe it as a [vendor](#adding-a-vendor) instead.

**The id is the identity of the provider, config included.** The control caches the component under it, so this
list may be rebuilt on every render without remounting the map — but a provider whose config changed needs a
new id to be picked up. That is the opposite of the `onGetMapProvider` rule, where the *component* is what has
to stay stable.

#### Letting a maker choose in PCF

`LetUserSwitch`, `DefaultVendor`, `HereApiKey`, `MapyApiKey` and `GoogleApiKey` are parameters the control
resolves itself. They are the whole vendor configuration of a wrapper, and none of them needs vendor-specific
code behind it:

```xml
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
```

```tsx
<Map context={context} parameters={{ ...context.parameters, Dataset: dataset }} />
```

- A vendor is offered as soon as its api key has a value, and not before. OpenStreetMap is keyless, so it is
  always on the list.
- `LetUserSwitch` (**on by default**) offers that list through the picker. Turn it off and the control draws
  `DefaultVendor` alone, with no picker at all.
- `DefaultVendor` (**`leaflet` by default**) is the vendor the map opens with. An id with no configured vendor
  behind it — a key the maker left empty, a vendor nobody registered — falls back to `leaflet` and logs a
  warning rather than failing silently.
- Bind the keys to [Environment Variables](https://learn.microsoft.com/power-apps/maker/data-platform/environmentvariables)
  and one compiled control ships to every project unchanged; only the values differ per solution.

Google Maps is the one vendor the wrapper has to name in code. `@vis.gl/react-google-maps` is an optional peer
dependency, and importing it from inside the control would put it in every consumer's build graph whether they
use Google Maps or not — a bundler still has to resolve a dynamically imported module's own imports to build
its chunk, dynamic or not. So the *import* lives in the wrapper while the *key* stays in the manifest:

```tsx
import { googleMapsVendor } from '@talxis/base-controls/dist/components/Map/providers/GoogleMaps';

//module scope: the list is data, but the identity may as well be stable
const vendors = [googleMapsVendor];

<Map
    context={context}
    parameters={{ ...context.parameters, Dataset: dataset }}
    onGetMapVendors={() => vendors}
/>
```

Registered that way, Google Maps is indistinguishable from a built-in vendor: it appears once `GoogleApiKey`
has a value, `DefaultVendor` can name it, and `LetUserSwitch` lists it in the picker beside the rest. That is
the difference from `onGetMapProvider`, which takes the vendor list over entirely and can therefore only ever
offer the one provider it returns.

#### Adding a vendor

An `IMapVendor` is a descriptor, not a code path in the control — which is what keeps the manifest surface
extensible. The control walks the vendor list, reads the key each entry *names* off `parameters`, and offers
the ones that are configured; it knows nothing about any particular vendor:

```ts
export interface IMapVendor {
    id: string;                     // what DefaultVendor and MapProviderId carry
    label: string;                  // shown in the picker
    apiKeyParameterName?: string;   // omit for a keyless vendor
    createProvider: (apiKey: string) => IMapProvider;
}
```

```ts
const azureMapsVendor: IMapVendor = {
    id: 'azure',
    label: 'Azure Maps',
    apiKeyParameterName: 'AzureMapsApiKey',
    createProvider: (apiKey) => createAzureMapsProvider({ apiKey })
};

<Map context={context} parameters={parameters} onGetMapVendors={() => [azureMapsVendor]} />
```

Adding `AzureMapsApiKey` to the manifest is then the entire integration, and it is additive: a manifest that
does not declare the property configures no Azure Maps vendor and behaves exactly as before. That holds for
anything added later, including vendors shipped by a future version of this package — existing manifests
neither know nor care about a key they do not set.

An entry reusing a built-in id replaces it, which is how a built-in vendor gets relabelled or reconfigured:

```ts
const vendors = [
    { ...googleMapsVendor, label: 'Maps' },
    //HERE, but on the topographic style, still reading the standard HereApiKey parameter
    { id: 'here', label: 'HERE topo', apiKeyParameterName: 'HereApiKey',
      createProvider: (apiKey: string) => createHereMapsProvider({ apiKey, style: 'topo.day', darkStyle: 'topo.night' }) }
];
```

Vendors are plain data, so this list may be rebuilt on every render. The control caches the provider it builds
from a vendor per id **and api key**, so editing a key rebuilds that vendor's provider — and only that one.

---

### Props — `IMap`

| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| `context` | `IContext` | ✅ | The PCF context. Used for user settings and the Fluent design language the theme is derived from. |
| `parameters` | `IMapParameters` | ✅ | See below. |
| `translations` | `IMapTranslations` | — | `mapProvider`, the label of the provider picker. Also reaches providers as `labels`, so provider chrome can be localized from the same place. |
| `state` | `ComponentFramework.Dictionary` | — | Part of the shared `IControl` contract. **This control ignores it.** |
| `onNotifyOutputChanged` | `(outputs: IMapOutputs) => void` | — | Fires when the user pans, zooms, or picks another provider. |
| `onOverrideComponentProps` | `(props: IMapProviderProps) => IMapProviderProps` | — | Escape hatch to rewrite what the provider receives. Prefer passing your own provider instead. |
| `onGetMapVendors` | `() => IMapVendor[]` | — | Vendors registered on top of the built-in ones, so the control builds them from manifest keys too. How Google Maps is offered, and the extension point for a vendor of your own. See [Adding a vendor](#adding-a-vendor). |
| `onGetMapProvider` | `() => IMapProvider` | — | One provider, built by the host — **takes the vendor list over entirely**. Defaults to the keyless Leaflet/OpenStreetMap provider. Return a stable component: a new identity on every render remounts the map. |
| `onGetMapProviders` | `() => IMapProviderOption[]` | — | A list of providers built by the host — **takes the vendor list over entirely**, and wins over `onGetMapProvider`. The control renders the picker from two options up. See [Letting the end user switch](#letting-the-end-user-switch). |
| `onResolveFallbackLocation` | `(signal: AbortSignal) => Promise<IMapCoordinates \| null>` | — | Opt-in resolver used to center the map while the dataset has no pins. See [Fallback location](#fallback-location). |

### `parameters` — `IMapParameters`

| Parameter | Type | Required | Manifest | Description |
|-----------|------|:--------:|:--------:|-------------|
| `Dataset` | `IDataset` | ✅ | `data-set` | The dataset whose records become pins. Loading is the host's job (the `DatasetControl` already does it); the control reads what is loaded and listens for `onNewDataLoaded` and `onRecordsSelected`. |
| `LatitudeAttributeName` | `IStringProperty` | ✅ | `SingleLine.Text` | Static input. Attribute holding the latitude of a record. |
| `LongitudeAttributeName` | `IStringProperty` | ✅ | `SingleLine.Text` | Static input. Attribute holding the longitude of a record. |
| `RouteAttributeName` | `IStringProperty` | — | `SingleLine.Text` | Static input. Attribute grouping pins into routes. An empty raw value draws no routes. |
| `LetUserSwitch` | `Omit<ITwoOptionsProperty, 'attributes'>` | — | `TwoOptions` | Static input. Whether the control offers every configured vendor through its own picker. **Defaults to `true`** when unset; off draws `DefaultVendor` alone. Ignored once `onGetMapProvider`/`onGetMapProviders` is passed. |
| `DefaultVendor` | `IStringProperty` | — | `SingleLine.Text` | Static input. Id of the vendor the map opens with: `here`, `mapy`, `google`, or one registered through `onGetMapVendors`. **Defaults to `leaflet`**, which is also where an id with no configured vendor behind it falls back to, with a warning. With `LetUserSwitch` on, only the initial pick; off, the only vendor drawn. |
| `HereApiKey` | `IStringProperty` | — | `SingleLine.Text` | Static input. Offers the HERE vendor once set. |
| `MapyApiKey` | `IStringProperty` | — | `SingleLine.Text` | Static input. Offers the Mapy.com vendor once set. |
| `GoogleApiKey` | `IStringProperty` | — | `SingleLine.Text` | Static input. Offers the Google Maps vendor once set — provided the wrapper registered `googleMapsVendor` through `onGetMapVendors`. |
| `<Vendor>ApiKey` | `IStringProperty` | — | `SingleLine.Text` | Static input. Whatever api key parameter a vendor registered through `onGetMapVendors` names. Keys are resolved by name, so a vendor added later is additive - see [Adding a vendor](#adding-a-vendor). |
| `MapProviderId` | `IStringProperty` | — | `SingleLine.Text` | Not a configuration decision but the end user's pick, persisted: the control reports it as the output of the same name, and honours it over `DefaultVendor` while it has a value. Bind it to a field to make the choice stick. |
| `ViewportOptions` | `{ raw: IMapViewportOptions }` | — | code only | Overrides `fallbackCenter`, `fallbackZoom`, `singleLocationZoom`, `approximateLocationZoom`, `padding`. |

Every `parameters` entry is PCF-shaped — a dataset, an `IProperty`, or a `{ raw }` wrapper, the same shapes
`Grid` and `GridCellRenderer` use. Anything the host has to supply as code lives on the control's props
instead (`onGetMapVendors`, `onGetMapProvider`, `onGetMapProviders`, `onResolveFallbackLocation`), matching how
`DatasetControl` takes `onGetControlComponent`.

### `outputs` — `IMapOutputs`

| Output | Type | Description |
|--------|------|-------------|
| `Viewport` | `IMapViewport` | The viewport the provider is currently showing, reported when the user pans or zooms. Lets a host persist the view the user left the map in. |
| `MapProviderId` | `string` | Id of the provider the end user picked in the picker. Persist it and feed it back through the `MapProviderId` parameter to make the choice stick. |

### Using it from PCF

Everything a maker configures is a manifest property, so the wrapper carries no per-project code:

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

The wrapper forwards `context.parameters` straight through — everything above already arrives as an
`IStringProperty` or an `ITwoOptionsProperty`, so there is nothing to unwrap or memoize — and registers the one
vendor it has to import:

```tsx
import { googleMapsVendor } from '@talxis/base-controls/dist/components/Map/providers/GoogleMaps';

const vendors = [googleMapsVendor];

<Map
    context={context}
    parameters={{ ...context.parameters, Dataset: dataset }}
    onGetMapVendors={() => vendors}
    onNotifyOutputChanged={(outputs) => notifyOutputChanged(outputs)}
/>
```

That is the whole wrapper, for all four vendors. Which of them a project gets is decided by which keys the
maker filled in — typically Environment Variables per solution — and nothing in the wrapper changes between
projects. Drop the `googleMapsVendor` import and the `onGetMapVendors` prop if the project has no use for
Google Maps: the manifest property may stay, it simply configures nothing.

> An API key configured as a manifest property is readable by anyone who can open the page. That is normal for
> browser keys, but only safe while the key is restricted to the origins allowed to use it — which is the
> customizer's job, not something the control can do for them.

---

## Providers

A provider is nothing more than a component that accepts `IMapProviderProps`:

```ts
export type IMapProvider = ComponentType<IMapProviderProps>;
```

The convention is to expose it through a `createXProvider(config)` factory that closes over vendor-specific
config (API keys, tile URLs, style ids). That config never reaches the shared contract, which is why adding a
provider needs no change to the control or its interfaces.

A provider never learns that it can be swapped, either. The picker is control chrome, and both wrappers around
a provider — the `IMapProviderOption` entries `onGetMapProviders` returns and the `IMapVendor` descriptors
`onGetMapVendors` returns — sit outside it rather than adding anything to `IMapProviderProps`. Every provider
written against the contract works in a picker, and can be configured from a manifest, without knowing either
exists.

The two wrappers differ only in who builds the provider. An **option** carries one that the host built and
closed its config over; a **vendor** carries the factory instead, so the *control* builds it from an api key
the maker configured. Which is why manifest-driven configuration is a vendor list and code-driven configuration
is an option list:

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
| `routes` | Lines to draw. Empty unless the `RouteAttributeName` parameter names an attribute. |
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

The control derives the viewport from the pins and hands the result to the provider; providers apply it and
never compute their own. This keeps every provider consistent instead of each one reinventing "center on the
single pin, fit bounds around several, fall back to something sane when there are none".

```ts
getMapViewport(coordinates, options?) // -> { center, zoom, bounds?, padding }
```

- `bounds` is set only when there is more than one location. Fit them, keeping `padding` pixels free.
- Otherwise apply `center` and `zoom`.
- Apply the viewport when its **object identity** changes. The control keeps the identity stable while the
  derived viewport is unchanged, so a refresh that returns the same records does not pull the map back from
  wherever the user panned to.
- A provider mounted by a provider switch is handed the center and zoom the previous one last reported, so
  there is nothing extra to implement: apply what you receive and the user keeps their view.

### Routes

Setting `RouteAttributeName` groups records that share the same non-empty value of that attribute
into one `IMapRoute`, ordered the way the dataset returns them. Routes of fewer than two pins are dropped. A
provider draws each route as a single line through `route.locations`.

### Selection

`onLocationClick` sets the dataset selection, which comes back to the provider as `selectedLocationIds` — so
selection stays in sync with any other control bound to the same dataset. Every shipped provider dims the pins
outside the selection.

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
instead. The control debounces the call so a fast-loading dataset skips it entirely.

---

## The shipped providers

### Leaflet (default)

`leaflet` and `react-leaflet` are regular dependencies, because the default has to work out of the box. The
provider imports `leaflet/dist/leaflet.css` itself and draws its pins as inline SVG, so there are no image
assets to configure and the pin takes its color from `theme.palette.themePrimary`.

The package is marked `sideEffects: false`, so if tiles ever render misaligned in a host with aggressive
tree-shaking, import the stylesheet from the host as well:

```ts
import 'leaflet/dist/leaflet.css';
```

The default tiles come from the **public OpenStreetMap servers**, which are fine for development but have a
[usage policy](https://operations.osmfoundation.org/policies/tiles/) that production apps should not rely on.
Point the provider at your own tile server instead:

```tsx
import { createLeafletMapProvider } from '@talxis/base-controls/dist/components/Map/providers/Leaflet';

const mapProvider = createLeafletMapProvider({
    tileLayerUrl: 'https://tiles.example.com/{z}/{x}/{y}.png',
    attribution: '&copy; Example'
});

<Map context={pcfContext} parameters={parameters} onGetMapProvider={() => mapProvider} />
```

> `react-leaflet@3` requires React 17. The control declares React 16.8+ as a peer, so a host still on React 16
> has to pass a provider of its own rather than use the default.

### HERE

Backed by the [HERE Raster Tile API v3](https://www.here.com/docs/category/raster-tile-api-v3). The tiles are
plain XYZ raster images, so there is no HERE SDK to install — an API key from a project on the
[HERE platform](https://www.here.com/developer) is the whole setup:

```tsx
import { createHereMapsProvider } from '@talxis/base-controls/dist/components/Map/providers/HereMaps';

const mapProvider = createHereMapsProvider({ apiKey: '...' });
```

| Config | Default | Description |
|--------|---------|-------------|
| `apiKey` | — | **Required.** Sent as a query parameter on every tile request, so restrict it to the origins allowed to use it. |
| `style` | `explore.day` | Style rendered while the control theme is light. |
| `darkStyle` | `explore.night` | Style rendered while the control theme is dark. |
| `resource` | `base` | `base` \| `background` \| `blank` \| `label` — which layer of the map a tile carries. |
| `format` | `png8` | `png` \| `png8` \| `jpeg`. Prefer `jpeg` for the satellite styles. |
| `size` | `512` | `256` \| `512`. Both cover the same tile, so 512 is a higher-resolution render of the same area — the retina option, not a zoom shift. |
| `ppi` | `100` | `100` \| `200` \| `400`. Scales up labels and road widths for a high-density display. |
| `lang` | HERE default | BCP 47 tag the labels are rendered in, e.g. `cs-CZ`. |
| `attribution` | `© <year> HERE` | The HERE copyright notice their terms require. Override to reword or extend it, not to remove it. |

**This is the one shipped provider with a real dark map.** It follows the control theme by swapping
`style` for `darkStyle` rather than CSS-inverting the tiles, so a dark theme gets a map HERE drew dark instead
of a photo negative of a light one.

`explore.*`, `lite.*`, `logistics.*` and `topo.*` all have day and night variants; `satellite.day` and
`dem` do not. The authoritative list for a given key is whatever `GET https://maps.hereapi.com/v3/info`
returns — the `IHereMapsStyle` union mirrors it at the time of writing.

### Mapy.com

Backed by the [Mapy.com Map Tiles API](https://developer.mapy.com/rest-api-mapy-cz/function/map-tiles/), which
has the best coverage of Czechia and Slovakia of the four. Also plain XYZ raster tiles, so again nothing to
install beyond an API key from the [Mapy.com developer portal](https://developer.mapy.com/):

```tsx
import { createMapyProvider } from '@talxis/base-controls/dist/components/Map/providers/Mapy';

const mapProvider = createMapyProvider({ apiKey: '...', mapset: 'outdoor' });
```

| Config | Default | Description |
|--------|---------|-------------|
| `apiKey` | — | **Required.** Sent as a query parameter on every tile request, so restrict it to the origins allowed to use it. |
| `mapset` | `basic` | `basic` \| `outdoor` \| `winter` \| `aerial` \| `names-overlay`. |
| `retinaTiles` | `true` | Requests the tiles rendered at twice the resolution. Only `basic` and `outdoor` are served that way, so it is ignored for the rest. |
| `lang` | `cs` | Language of the tile labels. Only affects zoom 6 and below — country and region names. |

**The provider carries the attribution their licence requires.** Mapy.com mandate a visible, clickable logo at
least 30px tall linking to mapy.com, plus a copyright notice linking to their copyright page. Both are rendered
by the provider, so a host cannot forget them — the logo sits bottom-left over the map and the notice goes in
the Leaflet attribution line. It uses the variant of the logo that carries its own green background, so it
stays legible on every map set and in either theme.

Mapy.com have no dark map set, so a dark control theme filters the tiles the same way the OpenStreetMap default
does. The exception is `aerial`: inverting photography produces a negative rather than a dark map, so that map
set is left alone.

### Google Maps

Neither `createGoogleMapsProvider` nor `googleMapsVendor` is re-exported from the package barrel — both live
behind their own entry point:

```ts
import { createGoogleMapsProvider, googleMapsVendor } from '@talxis/base-controls/dist/components/Map/providers/GoogleMaps';
```

`googleMapsVendor` is the descriptor that lets the control configure Google Maps from the `GoogleApiKey`
parameter, exactly like the other three vendors — pass it through `onGetMapVendors`. `createGoogleMapsProvider`
is the factory behind it, for a host that builds the provider itself.

`@vis.gl/react-google-maps` is an *optional* peer dependency, so consumers who stay on the default do not
install a Google Maps SDK wrapper they never load. Install it alongside the package when you use this provider:

```bash
npm install @vis.gl/react-google-maps
```

A provider that brings an SDK should follow the same shape — its own entry point, its own optional peer
dependency — so the barrel stays free of vendor SDKs. A provider that only needs an API key, like HERE and
Mapy.com, costs a consumer nothing and is exported from the barrel as well as from its own folder.

---

## Writing a provider

`providers/Leaflet/LeafletMapProvider.tsx` is the reference implementation: roughly 160 lines covering the
whole contract — applying the viewport, reporting it back, routes, selection, theme-aware tiles and pins. It is
the fastest way to see what a new provider has to do, and it was written against the public contract only, so
nothing in it depends on control internals.

### For another raster tile service

If the vendor serves XYZ raster tiles — as HERE, Mapy.com and most tile services do — do not implement the
contract again. That file exports the `LeafletMap` renderer it is built on, and a provider on top of it is only
the code that builds a tile URL plus whatever chrome the licence asks for:

```tsx
const AcmeMap = (props: IMapProviderProps & IAcmeConfig) => (
    <LeafletMap
        {...props}
        tileLayerUrl={`https://tiles.acme.com/{z}/{x}/{y}.png?key=${props.apiKey}`}
        attribution='&copy; <a href="https://acme.com/legal">Acme</a>'
        maxZoom={20} />
);

export const createAcmeProvider = (config: IAcmeConfig): IMapProvider =>
    (props: IMapProviderProps) => <AcmeMap {...props} {...config} />;
```

`ILeafletMapConfig` is the whole surface `LeafletMap` adds on top of `IMapProviderProps`:

| Config | Default | Description |
|--------|---------|-------------|
| `tileLayerUrl` | public OpenStreetMap tiles | XYZ template Leaflet substitutes `{z}`/`{x}`/`{y}` into. |
| `attribution` | OpenStreetMap notice | Rendered as HTML, so it can carry the links a licence asks for. |
| `minZoom` | Leaflet default | Lowest zoom the service serves. |
| `maxZoom` | 18 | Highest zoom the service serves. Leaflet stops at 18 unless told otherwise, so a service that goes deeper has to say so or the last zoom levels render blank. |
| `invertTilesInDarkTheme` | `true` | Whether a dark theme is produced by CSS-inverting the tiles. Set `false` for a service with a dark style of its own — inverting already-dark tiles turns them light again. |
| `overlay` | — | Chrome rendered over the map, for what a licence mandates and the attribution line cannot carry. Mapy.com's logo is the shipped example. |

`providers/HereMaps` and `providers/Mapy` are both roughly 40 lines of actual logic on this seam and are worth
reading before writing a third.

Reach for a provider written against `IMapProviderProps` directly — the way `providers/GoogleMaps` is — when
the vendor renders through its own SDK rather than serving tiles.

> **Note:** the control is exported as `Map`, which shadows the built-in `Map` constructor inside any module
> that imports it. Alias it (`import { Map as TalxisMap }`) or use `Set`/plain objects if you need the built-in.
