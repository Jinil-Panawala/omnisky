# Live ingestion: turning OmniSky on

The console currently runs entirely on demo data. This plan wires real public feeds into it — aircraft, ships, satellites and launches — while keeping the demo mode intact so the interface always works even when a feed is down.

## What you'll get

- A **Demo / Live** switch in the top bar. Demo keeps today's sample world; Live shows real tracked entities. The two are never mixed.
- Real aircraft (ADSB.lol), ships (AISStream, worldwide with a capped sample per update), satellites (CelesTrak orbits, positions computed in your browser) and rocket launches (Launch Library 2).
- A status light that tells the truth: **Live**, **Connecting**, or **Data delayed** based on how fresh the newest records actually are — per feed.
- Every entity shows "Updated X ago" and its source. Anything older than a few minutes is dimmed rather than shown as live.
- The activity feed lists real updates as they arrive instead of scripted lines.
- An attribution strip crediting ADSB.lol, AISStream, CelesTrak, Launch Library 2, OpenStreetMap and NASA imagery.
- Risk scores and AI insights stay on screen but remain clearly demo-only, as you asked.

## About the Redis queue

This hosting has no place to run a persistent Redis server or long-lived worker processes, so a real Redis queue can't be part of the $0 MVP. The plan keeps the *same shape* — ingest, then normalise/validate/deduplicate, then write current state — with the database acting as the single buffer and store. The processing step is a separate module per source, so if you later move to a host with Redis, only the transport between ingest and processing changes; adapters, schema and frontend stay as-is.

Everything else in the stack stays free with no credit card: ADSB.lol (courtesy public API, attribution required, no key), AISStream (free key, already saved), CelesTrak (free, attribution, no bulk hammering), Launch Library 2 (free tier ~15 requests/hour — we poll every 15 minutes), OpenStreetMap tiles (fair-use, attribution).

## Technical plan

**Canonical model.** New `src/lib/entities/` holds the shared `Entity` union (id, type, lat, lon, altitude, speed, heading, timestamp, source, name, identifier, metadata) plus one adapter per provider: `adsb.ts`, `aisstream.ts`, `celestrak.ts`, `launchlibrary.ts`. The existing mock data is remapped onto the same model so the UI has a single shape. Provider-specific fields never reach components.

**Ingestion.** The four routes under `src/routes/api/public/ingest/*` already exist and stay; they get refactored to call the adapters and a shared `processBatch` helper (normalise → range-validate lat/lon/speed → dedupe by key, newest wins → upsert current state → sampled history insert). Cron secret auth stays.

**Schedules.** A migration adds pg_cron jobs (none are scheduled today) calling the stable preview/production URLs with the cron secret: aircraft every minute, vessels every minute, satellites hourly, launches every 15 minutes. Vessels stay capped per tick; the AIS socket window stays short.

**Retention.** Current-state tables keep only entities seen in the last 10 minutes (aircraft/vessels already prune). `position_history` gets a nightly cron delete of rows older than 24 hours, plus indexes on `(craft_type, craft_id, recorded_at)`. Launches drop 3 days after their window. No raw message storage.

**Reads and realtime.** A public server function returns the current snapshot for the initial paint (publishable-key client, existing anon SELECT policies, no admin client). A migration adds `aircraft_positions`, `vessel_positions` and `launches` to the realtime publication; the browser subscribes once in a `useLiveEntities` hook and patches entities in place. Satellites refetch TLEs hourly and propagate with satellite.js on an animation tick — no realtime traffic.

**Feed health.** A `data_sources` table (source key, last success, last error, rows written) written by each ingest run; a small poll drives the status light and the per-source rows in the control panel.

**Frontend wiring.** A Zustand store (`src/state/entities.ts`) holds entity maps by type and the demo/live mode; the Cesium globe reads from it and updates billboards in place. Filters, search and selection keep working against the canonical model. Search is debounced.

**Security.** AISStream key, service-role key and cron secret stay server-side only; the browser gets normalised public fields.

## Steps

1. Canonical entity model + four adapters; remap mock data onto it.
2. Refactor the four ingest routes onto adapters + shared processing.
3. Migration: `data_sources` table, history retention job, indexes, realtime publication, pg_cron schedules.
4. Public snapshot server function + `useLiveEntities` realtime hook + entity store.
5. Top-bar Demo/Live toggle, real status light, freshness dimming, real activity feed, attribution strip.
6. Verify end to end: trigger each ingest, confirm rows land, watch the globe update live.

## Out of scope

No anomaly detection, natural-language search, threat scoring, historical tracks, time slider, geofencing or correlation engine. Those wait for later phases.
