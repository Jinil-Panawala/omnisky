# OmniSky

A live global situational-awareness console: real-time aircraft, ships,
satellites and launches on an interactive 3D globe, with an AI-assisted
alert feed and optional daily digest.

Built with [Lovable](https://lovable.dev).

## What it does

- **Live globe (CesiumJS)** — renders thousands of entities with
  zoom-dependent detail, viewport culling and clustering; objects glide
  smoothly between position updates instead of teleporting.
- **Real data** — aircraft from ADSB.lol and vessels from AISStream are
  ingested on a schedule into a Postgres database and served as snapshots.
- **Alert & insight feed** — plain-code detectors scan the live data for
  interesting activity (ships that go silent, aircraft flying unusually
  high, tight formations, crowded airspace, imminent launches, traffic
  swings). An AI model phrases the findings in one batched, low-cost
  request per run; clicking an alert flies the globe to that spot.
- **Accounts** — email + Google sign-in. Accounts unlock a daily digest:
  a short AI-written brief of the day's highlights, readable in the app.
- **Demo mode** — a toggle on the console swaps live data for a bundled
  mock dataset, handy for development and screenshots.

## Architecture at a glance

```text
ADSB.lol / AISStream          (external feeds)
        │
        ▼  scheduled cron calls
src/routes/api/public/ingest/* ──► src/server/services/ingest/*
        │                                writes via
        ▼                                src/server/db
     Postgres (Lovable Cloud)
        │
        ▼  snapshot / insights / digest reads
src/functions/*.functions.ts  ──►  browser console (src/routes/index.tsx)
```

A detailed map of the code — what each folder is for and the layering
rules — lives in **[src/README.md](src/README.md)**. Several folders have
their own short README too (`src/server/`, `src/domain/`, `src/functions/`,
`src/hooks/`, `src/components/`, `src/routes/`).

## Tech stack

- TanStack Start (React 19, SSR, server functions) + Vite
- CesiumJS for the globe
- Lovable Cloud (Supabase: Postgres, Auth, Storage, scheduled jobs)
- Lovable AI Gateway for alert wording and digest composition
- Tailwind CSS v4 + shadcn-style components
- Vitest + Testing Library (`npm test`)

## Development

```sh
npm i
npm run dev      # start the dev server
npm test         # run the test suite
```

Secrets (feed and AI keys) live in the backend's encrypted secret store
and are only read by server code — never committed or shipped to the
browser.
