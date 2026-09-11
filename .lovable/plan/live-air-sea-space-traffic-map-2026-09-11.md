# Live Air, Sea & Space Traffic Map

A real-time map showing live aircraft (ADSB.lol), vessels (AISStream), satellites (CelesTrak TLEs), and rocket launches (Launch Library 2) on a MapLibre map, with positions updating every few seconds.

## What you'll see

- Full-screen dark map at `/` with aircraft, vessel, and satellite markers, each rotated to its heading/track
- Launch sites with countdowns for upcoming rocket launches
- Click any marker for a detail panel: name/callsign, altitude, speed, heading, orbit info, launch window, last-seen time
- Layer toggles (aircraft / vessels / satellites / launches) and live counts
- Aircraft and vessel positions stream to the browser within seconds of ingestion; satellites propagate smoothly client-side

## Architecture (adapted to this platform)

The diagram's Redis queue and long-running workers don't exist here (no persistent processes), so the pipeline becomes:

```text
ADSB.lol API ──► scheduled ingest (every ~15s) ──────┐
AISStream WS ──► scheduled ingest (short-lived        ├─► Postgres (latest positions
                  websocket capture per tick) ────────┤    + position history)
CelesTrak TLEs ─► scheduled ingest (hourly) ──────────┤
Launch Lib 2 ──► scheduled ingest (every ~15 min) ────┘
                                                        │
                                             Supabase Realtime broadcast
                                                        │
                                                   MapLibre UI
                                            (satellite.js propagates
                                             orbits in the browser)
```

- **Aircraft ingest**: server route `GET /api/public/ingest/aircraft` polls the free ADSB.lol API, upserts into `aircraft_positions`, appends to `position_history`. Triggered by pg_cron.
- **Vessel ingest**: server route `GET /api/public/ingest/vessels` opens an AISStream websocket for a short window per tick (~10s), collects reports, upserts into `vessel_positions`. AISStream requires a free API key from aisstream.io — you'll paste it into a secure form after the endpoint exists.
- **Satellite ingest**: server route `GET /api/public/ingest/satellites` pulls TLE sets for a curated group (ISS, stations, Starlink, NOAA, etc.) from CelesTrak and stores them in `satellite_tles`. The browser propagates each orbit with satellite.js, so satellite motion is smooth without hammering the database.
- **Launch ingest**: server route `GET /api/public/ingest/launches` polls the free Launch Library 2 API for upcoming and recent launches (rocket, mission, pad location, window, status) into `launches`.
- **Realtime**: positions tables are added to the realtime publication; the browser subscribes and updates markers in place. TLEs and launches refresh on a slower cadence (refetch, not realtime).
- **No Redis/event-store equivalents**: Postgres is the single store.

## Data model

- `aircraft_positions` — icao24 (pk), callsign, lat, lon, altitude, velocity, heading, vertical rate, on_ground, updated_at
- `vessel_positions` — mmsi (pk), ship name, lat, lon, speed, course, heading, ship type, updated_at
- `satellite_tles` — norad_id (pk), name, tle_line1, tle_line2, category, updated_at
- `launches` — launch id (pk), name, rocket, mission, pad name, pad lat/lon, window start/end, status, updated_at
- `position_history` — craft type, id, lat, lon, altitude/speed, recorded_at (for future trail playback)
- Public read-only SELECT policies (anon); writes via service role inside the ingest routes only

## UI

- MapLibre GL with a dark vector basemap (free CARTO dark tiles, no key needed), loaded client-side only
- Efficient rendering via GeoJSON sources + symbol layers (plane / ship / satellite / launch-pad icons, rotated by heading)
- Satellites get an orbit-track line (ground track) computed client-side from the TLE
- Detail sidebar per selection, layer toggles, live counts, auto-fit on first load

## Build steps

1. Enable Lovable Cloud (database + realtime + scheduled jobs)
2. Migration: the five tables, grants, RLS, realtime publication
3. Ingest server routes for ADSB.lol, AISStream, CelesTrak, Launch Library 2 + pg_cron schedules
4. AISStream API key requested via secure form once the endpoint is live
5. Map UI at `/` with all four layers, popups, realtime subscription, satellite.js propagation
6. SEO head tags for the route

## Notes

- AISStream vessels near-real-time depends on their websocket feed density per tick; aircraft will be the freshest layer.
- CelesTrak and Launch Library 2 are free, keyless APIs. Map tiles use free open basemaps, so no map provider account is needed.
