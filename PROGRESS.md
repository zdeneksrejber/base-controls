# Map Base Control V2 — progress

Tracks delivery of the [Map Base Control V2](https://github.com/orgs/TALXIS/projects/3/views/3?pane=issue&itemId=239306331)
checklist (project item `239306331`). Branch `users/zdenek.srejber/map-features`.

The durable design lives in [`src/components/Map/README.md`](src/components/Map/README.md); this file is the
delivery log.

## Requested features

### Data
- [ ] **D1** Full address geo-coding as fallback when coordinates are not available
- [ ] **D2** Filtering by `IRecord` attributes
- [ ] **D3** Full text search by address, using the entity's quick find query
- [x] **D4** Paging — display all records, not only the current dataset page
- [x] **D5** Handle datasets of thousands of pins
- [x] **D6** Resolve any bound attribute through expands, using dot notation

### Interaction
- [ ] **I1** Update coordinates by dragging a pin (default: disabled)
- [ ] **I2** Place a marker by clicking the map (default: disabled), with reverse geo-coding, address
  component mapping, deletion and `prefillUserLocation`

### Pins
- [ ] **P1** Custom icons — colour / URL / web resource / custom renderer, chosen by conditional rules
- [ ] **P2** Popup card on pin click, localized, with `ExecuteFunction()` buttons, one card at a time
- [~] **P3** Automated group-by on pin overlap in the current viewport, with a count and a grouped card —
  *grouping and the count are done; the grouped card lands with P2*

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
