# Map Base Control V2 — progress

Tracks delivery of the [Map Base Control V2](https://github.com/orgs/TALXIS/projects/3/views/3?pane=issue&itemId=239306331)
checklist (project item `239306331`). Branch `users/zdenek.srejber/map-features`.

The durable design lives in [`src/components/Map/README.md`](src/components/Map/README.md); this file is the
delivery log.

## Requested features

### Data
- [x] **D1** Full address geo-coding as fallback when coordinates are not available
- [x] **D2** Filtering by `IRecord` attributes
- [x] **D3** Full text search by address, using the entity's quick find query
- [x] **D4** Paging — display all records, not only the current dataset page
- [x] **D5** Handle datasets of thousands of pins
- [x] **D6** Resolve any bound attribute through expands, using dot notation

### Interaction
- [x] **I1** Update coordinates by dragging a pin (default: disabled)
- [x] **I2** Place a marker by clicking the map (default: disabled), with reverse geo-coding, address
  component mapping, deletion and `prefillUserLocation`

### Pins
- [x] **P1** Custom icons — colour / URL / web resource / custom renderer, chosen by conditional rules
- [x] **P2** Popup card on pin click, localized, with `ExecuteFunction()` buttons, one card at a time
- [x] **P3** Automated group-by on pin overlap in the current viewport, with a count and a grouped card

### Pin connections
- [ ] **C1** Connect a group of pins into a line — ordered, grouped and coloured by attributes
- [ ] **C2** Optional: snap the line to roads via the provider's directions service

### Map legend
- [ ] **L1** Render simple HTML as a legend, loadable from a web resource, sanitized

### Map provider
- [x] **M1** Switch between Google Maps, OpenStreetMap, Mapy.com and Here.com, with provider-agnostic
  geo-coding, reverse geo-coding and directions — *provider switching already shipped; this adds the two
  geo service contracts and eight implementations, all verified against the live APIs*
- [ ] **M2** Hide/Show POI (default: hidden)

## Provider capability matrix

Verified live against real keys before any code was written.

| | Render | Geocode | Reverse | Directions | POI toggle |
|---|:--:|:--:|:--:|:--:|:--:|
| OpenStreetMap (Leaflet) | ✅ | Nominatim | Nominatim | OSRM | ✖ |
| HERE | ✅ | ✅ | ✅ | Routing v8 | ✖ |
| Mapy.com | ✅ | ✅ | ✅ | ✅ | ✖ |
| Google Maps | ✅ | ✅ | ✅ | Routes API † | ✅ |

† The Google key's project has neither the legacy Directions API nor the Routes API enabled, so Google
road-snapping is implemented but cannot be demonstrated until `routes.googleapis.com` is switched on.

## Log

### Phase 0 — foundations
- Added Vitest + jsdom. `npm test` runs `tsc -p tsconfig.test.json --noEmit` and then `vitest run`, so tests
  are typechecked as well as executed. Tests and their helpers are excluded from the package build.
- `vitest.setup.ts` polyfills `ResizeObserver` and `matchMedia`, which `@talxis/client-libraries` touches at
  import time and jsdom does not implement.
- Added `supercluster` and `dompurify` as dependencies; `adaptivecards` and `adaptivecards-templating` as
  **optional** peer dependencies, following the `@vis.gl/react-google-maps` precedent.
- Bumped the `@types/node` devDependency from 17 to 22 — Vitest requires ≥18, and CI already runs Node 24.
- Map provider api keys for the Storybook demo now come from a gitignored `storybook/.env.local`
  (`.env.local.example` is committed as the template).

### Phase 1 — D6, attribute paths
- `attributes.ts` resolves `cds_addressid.cds_latitude` for every attribute-named parameter. The registered
  column is preferred so value expressions still apply, with a raw data walk behind it that handles both the
  flat aliased key Dataverse returns and a nested expanded object.
- `linking.ts` adds the link entity and the aliased column when the dataset does not already carry them,
  hidden so a sibling control does not start showing them. `EnableAttributeLinking` turns that off.

### Phase 2 — M1, geo services
- `IMapGeocoder` and `IMapDirections` are separate, optional vendor capabilities: `IMapVendor` gained
  `createGeocoder` and `createDirections`, and a provider that has neither still renders.
- Eight implementations, each next to the renderer it belongs to: Google Geocoding + Routes, HERE Geocoding
  and Search + Routing v8, Mapy.com geocode/rgeocode + routing, Nominatim + OSRM for OpenStreetMap.
- A provider without a service borrows one from another configured vendor rather than losing the feature.
- `polyline.ts` decodes both encodings — Google's and HERE's flexible polyline — verified against a live
  HERE route and Google's own reference vector.
- Geocoding is cached and de-duplicated per lookup, and Nominatim is held to its one-call-a-second policy.
- `npm run test:live` calls the real services with keys from the environment; excluded from `npm test`.

### Phase 3 — D4, every page
- `PinLoading: 'all'` drains every page of the view before drawing, on a **clone** of the data provider, so
  the bound dataset and any pagination chrome around it are left exactly as they were.
- `MaxRecords` caps the load (50 000 by default) so an unscoped view cannot hang the browser, and the control
  says when it stopped short rather than silently drawing a subset.
- A status pill over the map reports progress while loading and the truncation warning afterwards.

### Fix found while verifying — Leaflet measured a container that was not laid out yet
Every Leaflet backed provider (OpenStreetMap, HERE, Mapy.com) drew a blank grey map with no tiles, in
Storybook and in any host that mounts the control before sizing it. Leaflet measures its container once at
creation and afterwards only on a window resize; mounted at zero width it cached that, `fitBounds` divided by
it, and the map held `NaN` coordinates for the rest of its life. Present since the provider work landed, not
introduced by V2.

The renderer now observes its container, re-measures on every change, and holds off applying a viewport until
the map has a real size. `isFiniteMapViewport` guards both directions, and reading the viewport back is
wrapped because an unlaid-out map throws rather than answering.

### Phase 3 — D5 and the grouping half of P3
- `clustering.ts` wraps `supercluster`: one index per set of pins, queried per viewport, so panning a large
  dataset costs a lookup rather than a rebuild and the provider only ever receives the pins in view. This is
  the same algorithm the legacy PCF used, but in the control, so all four vendors group identically.
- A grouped pin carries the exact count and the ids behind it; clicking one zooms to where it comes apart.
- `EnableClustering` (on by default) and `ClusteringOptions` control it.
- Verified in Storybook: 5 000 records draw as 22 pins, re-group to 75 on pan, and the viewport is reported.

### Phase 3 — D1, the address fallback
- `FullAddressAttributeName` names the attribute holding a record's address. A record with no readable
  coordinates is placed by geo-coding it through whichever configured vendor has a geo-coding service.
- Resolving is bounded on three sides: four lookups in flight, `MaxGeocodingRequests` per set of records
  (250 by default), and one lookup per distinct address however many records share it.
- An address the service cannot place is remembered as unplaceable rather than retried, which is what stops
  the fallback looping on it.
- `getMapPins` now reports the records it could not place, which is what the fallback consumes, and accepts
  the coordinates it resolves - so a geo-coded record also joins its route.
- Verified in Storybook against live HERE: 8 of 15 sites keep coordinates, the other 7 are placed from their
  postal address alone.

### Phase 3 — D3, one search box, two searches
- `EnableSearch` puts a search box over the map. Committing what is typed runs the entity's **quick find**
  through `setSearchQuery` and a refresh - the same call the dataset control's own header makes, wrapped in
  the same unsaved-changes blocker - so the records, and therefore the pins, are filtered.
- Typing also offers **places** from the geo-coding service. Picking one moves the map without touching the
  dataset, which is how you reach somewhere the records do not cover. `EnableAddressSearch` turns that half
  off on its own.
- Off by default, so a map hosted inside `DatasetControl` defers to the quick find already in that header.
- New `map-overlay` anchors the control's chrome over whichever provider is drawing, leaving room for the
  zoom control every tile provider puts in the same corner, and letting drags through to the map.
- Storybook now registers the Fluent icon set, which no story had done - every icon in every control was
  rendering as nothing.
- Verified against live Mapy.com: `Brno` filters 15 pins to 1, and picking `Ostrava, Czechia` off the
  suggestions moves the map to 49.835, 18.282 at zoom 15.

### Phase 3 — D2, filtering by record attributes
- `FilterAttributeNames` names the attributes the panel offers. Each becomes a list of the values the loaded
  records actually hold, with a count, so the panel describes the data rather than the schema.
- Values within one attribute widen the result and attributes narrow it - "depots or stores, in Brno".
- `FilterMode: pins` (the default) filters what the map draws, which is instant and works on every provider.
  `dataset` pushes an `In` filter expression to the bound dataset instead, so every control sharing it
  follows - at the cost of needing a provider that implements `In` for those attributes, which the in-memory
  provider used by the demos does not.
- Verified in Storybook: the panel offers store 9 / service 4 / depot 2, and picking depot leaves two pins.

### Phase 4 — P1, custom pins
- Three ways to decide how a pin looks, tried in that order: the `onResolvePin` prop (code), whatever a
  **Client API web resource** registered, and the `PinIcons` JSON rules (configuration).
- `PinIcons` keeps the legacy MapPicker's shape - an appearance plus the `attributeName` and `value` a record
  must match, first match wins, a rule with no attribute as the fallback - so an existing configuration
  carries over. The attribute is read through the same dot-notation resolver as every other binding.
- An appearance is a colour, an image `url`, a `webResourceName` the host resolves, or `svg` markup computed
  per record - which is the custom renderer, and covers the dynamic chart pin the issue points at.
- `ClientApiWebresourceName` / `ClientApiFunctionName` mirror the dataset control's own Client API, so a
  customizer writes the same kind of web resource for both.
- Both renderers cache icons per appearance, so panning a large map does not rebuild one per pin per frame.
- Verified in Storybook: depots red, service points green, everything else blue; and a second story draws
  every site as a capacity donut through the code hook.

### Phase 4 — P2 and the card half of P3
- One contract, `IMapCardRenderer`, with three built-in types and the Adaptive Card behind its own entry
  point. Which one a pin uses is chosen by the same rule matching as its icon, so "depots open an Adaptive
  Card, service points run a function" is one line of `Cards` configuration.
- `fields` shows the record's attributes and whatever buttons the card was given; `function` shows nothing
  and runs a web resource instead; `none` leaves the pin to selection alone.
- The Adaptive Card renderer carries the legacy `@OData.Community.Display.V1.FormattedValue` →
  `<attribute>_label` rename, so an existing template binds `${$root.name_label}` unchanged - and it copies
  rather than mutates, so rendering a card never touches the dataset.
- Card buttons and Adaptive Card `Action.Submit` both run `ExecuteFunction` through `executeFunctionAsync`.
- One card at a time is enforced by the control holding a single open pin, rather than by asking providers
  to close each other's.
- A grouped pin opens a card listing every record behind it, each rendered by its own rules, with a button
  to zoom to where the group comes apart.
- Verified in Storybook against live behaviour: the fields card with two working ExecuteFunction buttons, an
  Adaptive Card whose Capacity fact resolves through the renamed annotation, and a six-record grouped card.

**Known limitation, reported rather than hidden.** `adaptivecards-templating` parses expressions with
`adaptive-expressions`, which uses `antlr4ts`, which calls Node's `assert`. That chain does not survive
Vite's dependency optimizer - it throws where the `assert` shim is left undefined. Rather than let a card
fail to render because of where it was bundled, `expandAdaptiveCardTemplate` falls back to substituting the
simple `${...}` bindings and says so once in the console. The full engine - repetition, conditions,
functions - runs wherever it can, which includes webpack, rollup and Node; a test asserts the two agree
where they overlap. Storybook exercises the fallback path.

### Phase 5 — I1 and I2, writing the map back to the dataset
- `EnablePinDragging` writes a dropped pin's coordinates back to its record and saves. `EnablePinCreation`
  turns a click on empty map into a new record. Both are **off by default**: a map that moves records when a
  finger slips is worse than one that does not move them at all.
- Either gesture reverse geo-codes the point and writes the components back to whichever of the nine address
  attributes are bound, so a map click is a usable way to fill in an address. A component the service could
  not resolve is written as empty rather than skipped, so moving a pin out of a street clears the street.
- A record the map created carries a **Delete** button on its own card.
- `PrefillUserLocation` centres an empty map on the user, asking the browser first - the only source precise
  enough to drop a pin on - and falling through to `onResolveFallbackLocation` when it declines.
- **Fixed while verifying:** a create or an edit reports itself through `onAfterRecordSaved`, not
  `onNewDataLoaded`, so the map never redrew after either. The record loader now listens to both.
- Verified in Storybook against live HERE: a click created a record filled in as
  `273 / Lhotka / 277 31 / Czechia`, its card offered Delete, and dragging Brno depot wrote
  `49.6107 / 17.3804` back to the dataset.
