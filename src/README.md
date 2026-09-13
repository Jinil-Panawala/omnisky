# Codebase map

```text
src/
  domain/      Shared vocabulary. Pure types, constants and rules. No I/O.
               entities.ts    the Entity model the UI renders
               console.ts     UI state types (filters, layers, panels, viewport)
               live.ts        wire format between backend and browser
               ingest.ts      pure ingestion rules (coordinate validity, dedupe, TTLs)
               constants.ts   every tunable: names, polling cadence, row budgets
               strings.ts     every user-facing label in one place
               insights/      detection rules — one file per detector under detectors/

  functions/   Client-callable RPC (TanStack server functions). Thin wrappers
               over services — no SQL, no business logic.

  server/      Backend only. Never imported from components.
    db/        Query layer. The only place that talks to the database.
               snapshot.repository.server.ts   reads for the console
               positions.repository.server.ts  ingestion writes + pruning
               sources.repository.server.ts    feed-health bookkeeping
               client.server.ts                public / admin clients
    services/  Use cases. Compose domain rules + query layer.
               live.service.server.ts          snapshot, track, on-demand refresh
               ingest/                         one service per provider feed
               insights/                       alert detection + AI wording
               digest/                         daily digest compose + publish
    http/      Helpers for the public HTTP routes (auth, error shape)

  routes/      Pages and HTTP routes (file-based routing)
               index.tsx                the console
               auth.tsx / account.tsx   sign-in, profile + digest settings
               api/public/ingest/*      cron-triggered ingestion endpoints
               api/public/insights|digest/run.ts   scheduled insight/digest jobs

  components/  React UI. `console/` holds the globe, layout and panels.
  hooks/       Client data hooks (useLiveEntities drives the live pipeline).
  lib/         Client-safe helpers: geo maths, motion smoothing, row adapters.
  data/mock/   Demo dataset used by Demo mode.
  data/mock/   Demo dataset used by Demo mode.
  integrations/supabase/  Generated clients and auth glue (do not edit).
```

## Rules of the road

- Dependency direction: `routes/components` → `functions` → `server/services` →
  `server/db`. `domain` is a leaf everyone may import.
- Only services are callable by the client, and only through `src/functions`.
- SQL lives in `server/db` and nowhere else.
- Anything under `server/` or named `*.server.ts` is blocked from client bundles.
- New tunable value? Put it in `src/domain/constants.ts`.

Tests live at the repo root in `tests/` (`npm test` runs Vitest):
rule-level tests next to each concern (`insights.test.ts`, `detectors.test.ts`,
`spatial.test.ts`, `motion.test.ts`, `adapters.test.ts`, `panel-format.test.ts`),
UI tests under `tests/ui/`, and backend/service tests under `tests/server/`.
