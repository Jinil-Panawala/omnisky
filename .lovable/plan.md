# Live Air & Sea Traffic Map

A real-time map showing live aircraft (ADSB.lol) and vessels (AISStream) on a MapLibre map, with positions updating every few seconds.

## What you'll see

- Full-screen dark map at `/` with aircraft and vessel markers, each rotated to its heading
- Click a marker for a detail panel: callsign/name, altitude, speed, heading, last-seen time
- Layer toggles (aircraft / vessels) and a live count readout
- Positions stream to the browser within seconds of ingestion

## Architecture (adapted to this platform)

The diagram's Redis queue and long-running workers don't exist here (no persistent processes), so the pipeline becomes:

```text
ADSB.lol API ──► scheduled ingest (every ~15s) ──┐
AISStream WS ──► scheduled ingest (short-lived    ├─► Postgres (latest positions
                  websocket capture per tick) ────┘    + position history)
                                                        │
                                             Supabase Realtime broadcast
                                                        │
                                                   MapLibre UI
```

- **Aircraft ingest**: server route `GET /api/public/ingest/aircraft` polls the free ADSB.lol API, upserts latest positions into `aircraft_positions`, appends to `position_history`. Triggered on a schedule by pg_cron.
- **Vessel ingest**: server route `GET /api/public/ingest/vessels` opens an AISStream websocket for a short window per tick (~10s), collects position reports, upserts into `vessel_positions`. AISStream requires a free API key from aisstream.io — you'll paste it into a secure form after the endpoint exists.
- **Realtime**: both tables are added to the realtime publication; the browser subscribes and updates markers in place.
- **No Redis/event-store equivalents**: Postgres is the single store (latest state + history table).

## Data model

- `aircraft_positions` — icao24 (pk), callsign, lat, lon, altitude, velocity, heading, vertical rate, on_ground, updated_at
- `vessel_positions` — mmsi (pk), ship name, lat, lon, speed, course, heading, ship type, updated_at
- `position_history` — craft type, id, lat, lon, altitude/speed, recorded_at (for future trail playback)
- Public read-only SELECT policies (anon); writes via service role inside the ingest routes only

## UI

- MapLibre GL with a dark vector basemap (free CARTO dark tiles, no key needed)
- Efficient marker rendering via GeoJSON sources + symbol layers (plane/ship icons rotated by heading), loaded client-side only
- Detail sidebar, layer toggles, live counts, auto-fit on first load

## Build steps

1. Enable Lovable Cloud (database + realtime + scheduled jobs)
2. Migration: the three tables, grants, RLS, realtime publication
3. Ingest server routes for ADSB.lol and AISStream + pg_cron schedules
4. AISStream API key requested via secure form once the endpoint is live
5. Map UI at `/` with layers, popups, realtime subscription
6. SEO head tags for the route

## Notes

- AISStream vessels near-real-time depends on their websocket feed density per tick; aircraft will be the freshest layer.
- Map tiles use free open basemaps, so no map provider account is needed.
