# Real AI-Generated Alerts (Low Cost)

Replace the mocked Active Alerts and AI Insights with real, AI-written alerts derived from the live aircraft/vessel/satellite data already in the database — while keeping AI spend tiny.

## Cost strategy

The expensive way is asking a model to scan thousands of tracks. We don't do that.

1. **Detection is free.** Plain code scans the live snapshot for suspicious patterns: loitering aircraft (circling in a small radius over time), ships that stopped broadcasting (AIS gaps), unusual clusters of military-affiliated objects, activity spikes vs. a rolling baseline, and upcoming/observed launches.
2. **AI is used once per run, for wording only.** One batched request takes up to ~10 detected candidates and returns a short title + one-sentence analyst description + severity for each. Roughly a paragraph in, a paragraph out.
3. **One run every 10 minutes**, capped, and skipped entirely when nothing was detected. That is ~144 small requests/day maximum, usually far fewer.
4. Results are stored, so every visitor reads the same cached alerts — the panel never triggers a model call on page load or refresh.

## What the user sees

- Active Alerts and AI Insights fill with real, current events from live data instead of the fixed demo list.
- Each alert still links to its entity and zooms the globe on click, same as today.
- A small "updated Xm ago" stamp; if AI credits run out or the service is blocked, the panel keeps showing the last generated alerts plus a quiet notice instead of breaking.
- Panel layout, colors, and typography stay exactly as they are.

## Technical plan

**Database**
- New table `insights` (id, kind: `alert` | `insight`, severity, category, title, description, entity_id, entity_type, detected_at, expires_at, signal payload). Public read, service-role write, GRANTs plus RLS.
- New table `insight_jobs` single-row lease + status (running/paused, last_run_at, pause_reason) for single-flight and circuit-breaker state.
- Dedup: unique key on (kind, entity_id, category, detection bucket) so the same loitering aircraft isn't re-alerted every run.

**Detection (no AI)**
- `src/domain/insights.ts` — pure detector rules, thresholds, and types.
- `src/server/services/insights/detect.service.server.ts` — reads recent rows via a new `insights.repository.server.ts` + existing position history, emits candidate signals, ranks by severity, caps at 10.

**AI step**
- `src/server/services/insights/generate.service.server.ts` — one gateway call, `openai/gpt-6-astra` via the Responses API, streamed and consumed server-side, strict JSON schema for the array of `{title, description, severity}`. Fails soft: on error, candidates are still stored with rule-generated text.
- Follows gateway error semantics: 402/403 pauses the job in `insight_jobs` and surfaces it; 429/5xx backs off until the next run.

**Scheduling**
- `src/routes/api/public/insights/run.ts` — shared-secret-guarded POST, acquires the lease, runs detect → generate → store → prune expired. Triggered by pg_cron every 10 minutes.
- Bounded work per run, idempotent writes, paused-state guard at entry.

**Frontend**
- `src/api/insights.functions.ts` thin wrapper over a `listInsights` service; `src/routes/index.tsx` swaps mock arrays for a polled query (2 min). Mock data stays available for Demo mode.

## Expected cost

Under typical activity: a handful of short requests per hour, each a few hundred tokens. Detection, storage, and display cost nothing.
