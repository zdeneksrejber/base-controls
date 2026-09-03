# Map Base Control V2 — progress

Delivery log for the [Map Base Control V2](https://github.com/orgs/TALXIS/projects/3/views/3?pane=issue&itemId=239306331)
checklist (project item `239306331`), on branch `users/zdenek.srejber/map-features`.

The durable design lives in [`src/components/Map/README.md`](src/components/Map/README.md); this file records
what was delivered, how to see it, and what was found along the way.

## Every requested feature, and where to watch it work

Run `npm run storybook` and open **Map**. The sidebar is written for someone meeting the control for the
first time, so the pages are named after what they do rather than after the checklist; the mapping is below.
Every story was driven in a browser against the live provider APIs, not just typechecked.

### Data — *Map → Data*
- [x] **D1** Full address geo-coding as fallback when coordinates are not available
  → *Addresses without coordinates*. Half the sites have had their coordinates removed and are placed from
  their postal address alone, through live HERE.
- [x] **D2** Filtering by `IRecord` attributes
  → *Filtering by record attributes*. The panel offers the values the records hold — store 9, service 4,
  depot 2 — and picking depot leaves exactly those two pins.
- [x] **D3** Full text search by address, using the entity's quick find query
  → *Searching records, or an address*. `Brno` filters fifteen pins to one through quick find; picking a
  place off the live Mapy.com suggestions moves the map there instead.
- [x] **D4** Paging — display all records, not only the current dataset page
  → *The page the host loaded* and *Every page of the view*. Fifteen sites in a dataset paged four at a time,
  drawn one page then all fifteen.
- [x] **D5** The control must handle datasets of thousands of pins
  → *Thousands of pins*. Five thousand records drawn as grouped pins, re-grouped against the viewport on
  every pan.
- [x] **D6** Resolve any bound attribute through expands, using dot notation
  → Exercised by every story through the shared resolver, and documented at the top of the Data page;
  unit-tested against the flat aliased key, the nested expand and the array form.

### Interaction — *Map → Editing*
- [x] **I1** Update coordinates by drag and drop of a pin — default disabled
  → *Move a record by dragging its pin*. Dropping a pin writes the new coordinates back to the record, and
  the table under the map shows it land.
- [x] **I2** Place a marker by clicking the map — default disabled, with reverse geo-coding, the nine
  address components, deletion, and `prefillUserLocation`
  → *Create a record by clicking the map* and *Centre on the user when there is nothing to fit*. A click
  created a record filled in as `Hradiště ev. č. 9 / Hradiště / 338 08 / Czechia` from live HERE, its card
  offered Delete, and deleting left it deleted.

### Pins — *Map → Pins*
- [x] **P1** Custom icons — colour / URL / web resource / custom renderer, chosen by conditional rules
  → *A different pin per category* and *A chart drawn per record*. Depots red, service points green, stores
  blue by rule; and every site drawn as a capacity donut through the code hook.
- [x] **P2** Popup card on pin click, localized, with `ExecuteFunction()` buttons, one card at a time
  → *A card on pin click* and *An Adaptive Card instead*. The fields card with two working ExecuteFunction
  buttons, and an Adaptive Card whose Capacity fact resolves through the renamed `_label` annotation.
- [x] **P3** Automated group-by on pin overlap in the current viewport, with a count and a grouped card
  → *Pins that land on the same spot*. Six warehouses drawn as one pin carrying `6`, opening a card listing
  all six with a button to zoom to where they come apart.

### Pin connections — *Map → Routes*
- [x] **C1** Connect a group of pins into a line — ordered, grouped and coloured by attributes
  → *Connect pins into a line*. Three runs drawn blue, red and green in stop order, despite the records
  arriving sorted by name.
- [x] **C2** Optional: snap the line to roads via the provider's directions service
  → *Follow the roads instead*. The same three runs following the road network through live Mapy.com routing.

### Map legend — *Map → Legend*
- [x] **L1** Render simple HTML as a legend, loadable from a web resource, sanitized
  → *A legend over the map*. The markup deliberately ends in a `<script>` and an `<img onerror>`; neither
  reached the page, and the surviving link came out with `target="_blank" rel="noopener noreferrer"`.

### Map provider — *Map → Providers*
- [x] **M1** Switch between Google Maps, OpenStreetMap, Mapy.com and Here.com, with provider-agnostic
  geo-coding, reverse geo-coding and directions
  → *Switching, and points of interest*, and `npm run test:live`, which calls all eight services for real.
- [x] **M2** Hide/Show POI — default hidden
  → the same page: **showPointsOfInterest** is a switch on it. Off, Prague is bare basemap and two record
  pins; on, Pražský hrad, Karlův most, the museums and the arenas all come back.

**And one page that turns the lot on at once:** *Map → Overview*, the front page, where every feature is a
switch over a single map.

## How to run it

```bash
cp storybook/.env.local.example storybook/.env.local   # then paste in your HERE, Mapy.com and Google keys
npm run storybook                                       # http://localhost:6006 → Map
```

Without keys the keyless OpenStreetMap provider still draws every story; the vendors with no key are simply
not offered, and geo-coding falls through to Nominatim.

```bash
npm test        # typecheck, then 282 unit tests
npm run build   # the package build, which is also the repo's PR gate
npm run test:live   # calls the real geo services; needs MAP_HERE_API_KEY, MAP_MAPY_API_KEY, MAP_GOOGLE_API_KEY
```

## Decisions the issue asked for

- **The pin card** — one contract with three built-in renderers, chosen per pin by the same rules as the
  icon: the built-in Fluent card, an Adaptive Card behind its own entry point, and an ExecuteFunction that
  shows nothing and runs a web resource instead. That covers "or a combination", and its nice-to-have.
- **Search chrome** — the map hosts its own box, **off by default**, so a map inside `DatasetControl` defers
  to the quick find already in that control's header rather than showing a second one.
- **How the legend HTML is sanitized** — DOMPurify with its HTML and SVG profiles, `style` allowed because a
  legend is mostly colour swatches, forms and embeds forbidden, unknown protocols rejected, and every
  surviving link rewritten to open detached from the app.

## Provider capability matrix

Verified against real keys before any code was written, and re-verified by `npm run test:live`.

| | Render | Geocode | Reverse | Directions | POI toggle |
|---|:--:|:--:|:--:|:--:|:--:|
| OpenStreetMap (Leaflet) | ✅ | Nominatim | Nominatim | OSRM | ✖ |
| HERE | ✅ | ✅ | ✅ | Routing v8 | approximated |
| Mapy.com | ✅ | ✅ | ✅ | ✅ | ✖ |
| Google Maps | ✅ | ✅ | ✅ | Routes API † | ✅ |

† **The one thing that cannot be demonstrated on the supplied key.** The Google project has neither the
legacy Directions API nor the Routes API enabled, so `routes.googleapis.com` answers `PERMISSION_DENIED`.
Google road-snapping is implemented against the Routes API and will work the moment that api is switched on
in the console; until then the control reports it and draws a straight line. C2 is demonstrated on HERE,
Mapy.com and OSRM, all three verified live.

## Bugs found and fixed while building this

Three of these predate V2 and would have shipped unnoticed.

1. **Every Leaflet-backed provider drew a blank map when mounted before layout.** Leaflet measures its
   container once, at creation, and after that only on a window resize. Mounted at zero width — Storybook, a
   hidden tab, any host that mounts the control before sizing it — it cached that, `fitBounds` divided by it,
   and every coordinate it computed afterwards was `NaN`. No tiles were ever requested. The renderer now
   observes its container and holds off until the map has a real size.
2. **Nothing redrew after a record was created or edited.** Both report themselves through
   `onAfterRecordSaved`, not `onNewDataLoaded`, which was the only event the control listened to.
3. **Draining every page destroyed the provider its records still depended on.** The records read their
   columns back through it, so every card drawn in `PinLoading: all` silently lost its field labels and its
   title. The clone's lifetime now belongs to the caller.
4. **Storybook never registered the Fluent icon set**, so every icon in every control rendered as nothing.
5. **The Storybook dev server died on startup with `ENOSPC`** on this machine. Vite was watching the parent
   repository including `node_modules` and `dist`, and one inotify instance per watched directory exhausted
   `fs.inotify.max_user_instances` (1024, with 220 already held). The watcher now ignores the heavy
   directories, which is worth doing regardless. Where that is still not enough the real fix is
   `sudo sysctl fs.inotify.max_user_instances=8192` — and until then `STORYBOOK_POLL_WATCHER=1 npm run
   storybook` trades a little CPU for needing no inotify instances at all.

## Known limitation, reported rather than hidden

`adaptivecards-templating` parses expressions with `adaptive-expressions`, which uses `antlr4ts`, which calls
Node's `assert`. That chain does not survive Vite's dependency optimizer — it throws where the `assert` shim
is left undefined, and no combination of `optimizeDeps` include, exclude or aliasing fixes it. Rather than
let a card fail to render because of where it was bundled, `expandAdaptiveCardTemplate` falls back to
substituting the simple `${...}` bindings and says so once in the console. The full language — repetition,
conditions, functions — runs wherever the engine does, which includes webpack, rollup and Node, and a test
asserts the two agree where they overlap. Storybook therefore exercises the fallback path; a PCF built with
webpack gets the real engine.

## What was added to the repository

- **`npm test`** — Vitest behind a typecheck, 248 tests. The repo had no test runner at all.
- **`npm run test:live`** — the same geo services against the real APIs, excluded from `npm test`.
- Dependencies: `supercluster` and `dompurify` as regular ones; `adaptivecards` and
  `adaptivecards-templating` as **optional peers** behind their own entry point, following the
  `@vis.gl/react-google-maps` precedent. Verified: nothing but the two adaptive-card modules imports them.
- `@types/node` bumped from 17 to 22 — Vitest needs ≥18, and CI already runs Node 24.

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

### Phase 6 — C1 and C2, pin connections
- `RouteAttributeName` groups pins into a line, `RouteSequenceAttributeName` orders each line, and
  `RouteColorAttributeName` colours it. A numeric sequence sorts as numbers, so stop 10 follows stop 9; a
  stop with no sequence keeps its dataset position at the end.
- `SnapRoutesToRoads` asks the active directions service for the real path. Optional in every sense: a
  control that does not ask for it draws straight lines, a vendor with no directions service leaves them
  straight, and a single run the service cannot resolve stays straight while the others are snapped.
- Long runs are split across calls at each service's own stop limit and rejoined without repeating the
  shared stop.
- Verified in Storybook: three runs drawn blue, red and green in stop order despite the records arriving
  sorted by name, then the same three following the road network through live Mapy.com routing.

### Phase 6 — L1 and M2, legend and points of interest
- `Legend` takes markup and shows it over the map, collapsible; `LegendWebResourceName` loads the same
  markup from a web resource instead, and wins once it does - so a legend moves out of the manifest without
  anything else changing.
- **How the HTML is sanitized** (the decision the issue asked for): DOMPurify with its HTML and SVG profiles,
  with `style` explicitly allowed because a legend is mostly colour swatches, forms and embeds forbidden
  outright, unknown protocols rejected, and a hook that rewrites every surviving link to open detached from
  the app. Cleaning happens in the control, so nothing downstream ever holds markup that has not been
  through it.
- `ShowPointsOfInterest` is **off by default**, so the only pins on the map are the records. Google switches
  it properly through a map style; HERE approximates it with a lower detail style; the raster tile services
  that cannot express it ignore the property rather than pretending.
- Verified in Storybook: a legend whose markup deliberately ends in a `<script>` and an `<img onerror>` -
  neither reached the page, `window.legendWasExecuted` was never set, and the surviving link came out with
  `target="_blank" rel="noopener noreferrer"`. And Google drawing the airports and Pražský hrad only with
  points of interest turned on.

### Phase 7 — the showcase, and a bug it exposed
- **Map/V2/Everything at once** turns the whole checklist on over one map, so the features can be seen not to
  fight each other.
- Building it exposed a real bug: draining every page runs on a clone of the data provider, and the clone was
  being destroyed as soon as the drain finished - while the records it produced were still in use. Those
  records read their columns back through it, so every card drawn in `PinLoading: all` lost its field labels
  and its title. The clone's lifetime now belongs to the caller and is released only once a later load has
  replaced its records, or the control goes away.

### Review round — the Storybook rewritten for a reader, and four bugs you found

You reviewed the delivered build and reported six things. All six are done.

- **The ungrouped five-thousand-pin story lagged.** Removed. Grouping is what makes a dataset that size
  usable, so a story showing it turned off was demonstrating the problem rather than the feature.
- **Searching `Smíchov` crashed** with `props.record is undefined`. A card open when the dataset narrows
  under it left `MapCard` holding a record that had left the dataset, handed over through an `as IRecord`
  cast that hid exactly this. Three guards now: the renderer returns nothing for a missing record, a card
  whose record has gone is not rendered at all, and the open pin is dropped from state rather than left
  hanging. Reproduced and re-verified in the browser: with a card open on Ostrava, searching narrows the
  dataset, the card closes, nothing throws.
- **A deleted pin came straight back.** Leaflet decides a click was not meant for the map by walking up from
  the event target looking for its own opt-out marker — but a Delete button unmounts *itself* as it is
  pressed, so by the time the click finished bubbling the target was detached from the document, the walk
  found nothing, and the map fired `click`, which created a record at the very point the deleted one had
  been. New `isMapSurfaceClick` ignores a click whose target has already left the document; both renderers
  ask it before reporting a map click, and it has its own unit tests.
- **Centring on the user "was not working".** It was centring — but always at the approximate zoom, because
  a device position and an IP lookup were reported as the same kind of answer. A resolved location now
  carries `isPrecise`, a device position zooms to street level and an IP lookup stays at city level, and the
  two timeouts were rebalanced (geolocation 8s → 4s, fallback 2.5s → 12s) so the IP lookup actually gets its
  turn after a declined prompt instead of being aborted first.
- **The legend button was invisible.** The provider picker positioned itself absolutely and drew straight
  over it. Both now live in one overlay, the picker and the legend button sit in a row, and the legend panel
  drops below that row — so the button is beside the picker whether the legend is open or shut.
- **The Storybook was written for whoever built it.** Rewritten for whoever reads it: no `V2`, no `D5`, no
  `L1`. Seven pages named after what they do — **Overview**, **Data**, **Pins**, **Editing**, **Routes**,
  **Legend**, **Providers** — following the structure the Form control's own pages use: one autodocs page
  per topic, a prose introduction explaining *why* the control behaves the way it does, and stories named as
  sentences. *Providers* carries the points-of-interest switch, so switching vendors and hiding their POIs
  are one page rather than two. *Overview* is the front page, with every feature as a labelled manifest
  property you can toggle over a single map.

**And one more bug, found while verifying the above.** Google Maps drew its own red default marker for any
pin the control had resolved no appearance for, while every other provider drew the shipped pin in the
theme's colour — so switching vendors silently changed what the same record looked like. Google now draws the
shipped pin too. Making that unconditional exposed a second, worse one: building an icon touches
`google.maps.Size` and `google.maps.Point`, which do not exist until the Maps script has loaded, and the
markers were being rendered before it had. It only ever worked because the early return happened to skip that
line — meaning a `PinIcons` configuration on Google was one render-order coin-flip away from throwing. The
markers now wait for the api, which is also the only honest thing for a marker to do.

### Second review round — a Code toggle, keys without a local file, and one more location bug

- **A Code toggle, beside the map.** The Form pages have one, and the Map needed the same: a switch that
  swaps the live map for the configuration that page hands the control. The source is **generated from the
  parameters the story actually passed** rather than written alongside them, so what a reader inspects cannot
  drift from what they are looking at. Rule sets and legend markup are lifted into named constants above the
  component so the property list stays readable, and the code hooks a page uses — `onResolvePin`,
  `onGetCardRenderers` — appear with it.
- **Api keys without a local file.** Keys came only from a gitignored `.env.local`, which is no use once the
  Storybook is published: every story would fall back to OpenStreetMap with no way past it, and committing
  keys to avoid that would mean publishing somebody else's billing. Every map now carries an **Api keys**
  button. A reader pastes their own HERE, Mapy.com or Google key, it is kept in that browser's local storage
  and sent only to the vendor it belongs to, and every mounted map redraws with it. Where the build has its
  own keys those stay the default, and Clear goes back to them.
- **Two Overview rows on the front page.** The docs entry and the story had different ids, so the sidebar
  nested an Overview inside an Overview. Exporting the story under the name the docs page already uses merges
  them into one row — which is what the Form pages have been doing all along.
- **The map asked for a location while it had pins.** Two causes, both fixed. The control was reading "no
  pins yet" as "no pins": a 400 ms debounce was all that stood between a slow dataset and a location lookup
  for a map that was about to be full. `shouldResolveFallbackLocation` now makes the condition explicit and
  testable — nothing is asked until the host has finished fetching, every requested page is drained, and the
  addresses waiting on geo-coding have resolved. And the prefill story is now a switch that starts off: a
  docs page renders every story it has, so leaving it on meant opening **Editing** asked for your location
  while two maps full of pins sat above it. Verified by counting `getCurrentPosition` calls per page: zero
  everywhere, one only when the switch is turned on.

### Third review round — the Code panel told coders nothing, and keys needed a way in

**`onResolvePin={getPinAppearance}`** named a function that does not exist. Rendering the function's own
source through `toString()` fixed it in development and not at all once published: the minifier turns the
demo hook into `j=t=>{const a=Number(t.getValue("capacity"))||0,...}`, and transpilation had already thrown
the type annotations away. The panel now lifts the declaration out of the story's own module text, imported
with Vite's `?raw`, so it shows the source **as authored** — types, doc comment and all — in every build.
`extractDeclaration` walks the initializer counting brackets while stepping over strings, template holes and
comments, so a `}` inside an SVG string does not end it early.

**A sweep for the same defect elsewhere** — documentation showing code that is not the real code — turned up
one more, in the thing just built. The generated imports used `@talxis/base-controls/components/…`, which is
the alias this repository's own Storybook resolves to `src`. Only `/dist` is published, so a reader copying
that line gets a module that does not resolve. Every emitted import is now the consumer's path, matching what
the README documents, and a test asserts none of them can point anywhere else. The same wrong path was in the
Providers page prose. `onResolveFallbackLocation` was being passed by the demo host and never shown at all;
it is now listed with the rest. The Form pages came out clean: their examples are compiled from the same
string they display, so they cannot drift, and their aliased imports are never shown to a reader.

**Api keys, for someone who will not clone the repository.** The key panel was only reachable from a button
above each map. It is now the first thing on the **Overview** page, composed into that page's docs template
by hand so it sits above the map rather than under it. A visitor pastes a key, every map on every page
redraws, and it survives a reload. Verified against a Storybook built exactly as it publishes — `.env.local`
moved aside first, and the bundle checked for leaked keys: with no keys the provider picker does not appear
at all, after saving a Mapy.com key it offers OpenStreetMap and Mapy.com, and after a reload the map opens on
Mapy.com.
