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
- [ ] **D4** Paging — display all records, not only the current dataset page
- [ ] **D5** Handle datasets of thousands of pins
- [ ] **D6** Resolve any bound attribute through expands, using dot notation

### Interaction
- [ ] **I1** Update coordinates by dragging a pin (default: disabled)
- [ ] **I2** Place a marker by clicking the map (default: disabled), with reverse geo-coding, address
  component mapping, deletion and `prefillUserLocation`

### Pins
- [ ] **P1** Custom icons — colour / URL / web resource / custom renderer, chosen by conditional rules
- [ ] **P2** Popup card on pin click, localized, with `ExecuteFunction()` buttons, one card at a time
- [ ] **P3** Automated group-by on pin overlap in the current viewport, with a count and a grouped card

### Pin connections
- [ ] **C1** Connect a group of pins into a line — ordered, grouped and coloured by attributes
- [ ] **C2** Optional: snap the line to roads via the provider's directions service

### Map legend
- [ ] **L1** Render simple HTML as a legend, loadable from a web resource, sanitized

### Map provider
- [ ] **M1** Switch between Google Maps, OpenStreetMap, Mapy.com and Here.com, with provider-agnostic
  geo-coding, reverse geo-coding and directions
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
