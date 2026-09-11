# Aurora Intelligence — Interface First

Pause the data pipeline work and build the full interface shown in the reference image, driven by realistic placeholder data. Live feeds get wired into this shell afterwards.

## What gets built

A single full-screen command console, dark navy, no page scrolling — every panel scrolls inside itself.

```text
┌───────────────────────────────────────────────────────────────┐
│ AURORA INTELLIGENCE │  search bar  │ Quick Actions │ profile   │
├──────────┬──────────────────────────────────┬─────────────────┤
│ CONTROL  │  counters: aircraft / ships /    │  SELECTED       │
│ PANEL    │  satellites / launches / alerts  │  ENTITY         │
│ nav      │                                  │  details        │
│ ──────── │            MAP                   │  trajectory     │
│ FILTERS  │      (markers + tooltip)         │  risk score     │
│ ──────── │   2D/3D toggle, zoom, real-time  │  nearby         │
│ AI       │                                  │                 │
│ INSIGHTS │                                  │                 │
├──────────┴──────────────────────────────────┼─────────────────┤
│ TIMELINE / EVENT FEED  (tabs + rows + play) │ ACTIVE ALERTS   │
└─────────────────────────────────────────────┴─────────────────┘
```

Pieces, matching the reference:

- **Top bar** — logo lockup, AI search field with example hints, Quick Actions button, notification and inbox icons, analyst avatar.
- **Left rail** — Map / Timeline / Alerts (badge) / Investigations / Reports / Bookmarks / Layers; Filters block with time range, region, entity type, affiliation selects, altitude and speed sliders, Apply Filters button; AI Insights cards at the bottom.
- **Map area** — dark map with colour-coded aircraft, ship, satellite and launch markers, a hover tooltip card, a lat/lon/elevation readout box with scale bar, right-side map control stack, and 2D/3D + Real-time chips.
- **Counter strip** — five counts with trend deltas and a View Global Overview button.
- **Right panel** — selected entity header with type badge, attribute grid, location block, small trajectory chart, classification and risk score bar, nearby entities list.
- **Bottom timeline** — LIVE label, event category tabs, scrolling event rows with type chips and bookmark icons, time ruler with markers, playback controls, speed and UTC clock.
- **Active alerts panel** — severity-coloured alert cards with timestamps.

Everything is interactive at the shell level: nav switches the active item, layer/entity toggles filter markers, clicking a marker or an event row updates the right panel, tabs filter the feed. Numbers come from a placeholder dataset so the screen looks alive.

## Technical notes

- New `src/components/aurora/` folder: `TopBar`, `ControlPanel`, `FiltersPanel`, `AiInsights`, `CounterStrip`, `MapCanvas`, `EntityPanel`, `TimelineFeed`, `AlertsPanel`, plus a shared `types.ts` and `mockData.ts`.
- `src/routes/index.tsx` composes the layout in a CSS grid; existing `LiveMap.tsx` is replaced by `MapCanvas`, which keeps MapLibre with a dark raster basemap and GeoJSON symbol layers fed from mock data.
- Add a defence-console token set to `src/styles.css` (deep navy surfaces, cyan ships, blue aircraft, amber satellites, red launches/alerts, thin border and glow tokens); no hardcoded colours in components.
- Remove the `satellite.js` import path for now — its WASM build currently breaks the build with a top-level-await error. Orbit propagation returns when live satellite data is wired in.
- Ingestion routes under `src/routes/api/public/ingest/` stay in place; their TypeScript errors get fixed so the build is green.
- Fonts: a condensed technical sans for labels and a mono for numeric readouts, loaded via a link tag in the root route.
- Route head metadata updated for the console.

## Mock dataset

`src/data/mock/` holds a normalized dataset shaped exactly like the post-ingestion records, so the same components later swap onto live feeds without changes:

- `aircraft.ts` — ~120 entries matching `aircraft_positions` (icao24, callsign, lat, lon, altitude_m, velocity_ms, heading_deg, vertical_rate_ms, on_ground, updated_at), spread across realistic air corridors, a mix of civil and military callsigns.
- `vessels.ts` — ~90 entries matching `vessel_positions` (mmsi, ship_name, lat, lon, speed_kn, course_deg, heading_deg, ship_type), clustered on shipping lanes: Malacca, Suez, Gulf, English Channel.
- `satellites.ts` — ~40 entries matching `satellite_tles` (norad_id, name, tle_line1, tle_line2, category) using real, valid TLE strings for ISS, NOAA, GOES, GPS and Starlink samples, plus precomputed ground tracks for display.
- `launches.ts` — ~10 entries matching `launches` (id, name, rocket, mission, provider, pad_name, pad_lat, pad_lon, window_start, window_end, status).
- `events.ts`, `alerts.ts`, `insights.ts` — timeline events, active alerts and AI insight cards derived from the entries above so the feed references real callsigns and vessel names.
- `index.ts` exports a single `mockDataset` plus per-type selectors and a `toEntity()` normalizer that maps any record to the shared entity shape the map and detail panel consume.

Timestamps are generated relative to load time so the console always looks current. Records include the extra display fields the reference shows (affiliation, classification, risk score, nearby entities) on the entity model, kept separate from the database-shaped fields.


## Not in this step

Live ADSB / AIS / TLE / launch data, scheduled ingestion, realtime subscriptions, 3D globe mode, and working search — all follow once the interface is approved.
