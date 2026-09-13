# API Routes

This folder contains **raw HTTP endpoints** for callers outside the browser app:

- Cron jobs (`pg_cron`, external schedulers)
- Webhooks from third-party services
- Public read-only endpoints
- Any external script or API consumer

## Layout

```text
src/routes/api/
  api.ts                 # /api  – health / status
  public/
    ingest/
      aircraft.ts        # /api/public/ingest/aircraft
      vessels.ts         # /api/public/ingest/vessels
      satellites.ts      # /api/public/ingest/satellites
      launches.ts        # /api/public/ingest/launches
    insights/run.ts      # /api/public/insights/run
    digest/run.ts        # /api/public/digest/run
```

Routes under `api/public/*` bypass site authentication, so each handler must verify the caller itself (cron secret, apikey, webhook signature, etc.).

## How this differs from `src/api/`

- **`src/routes/api/`** (this folder) = HTTP endpoints. Used by external callers that speak plain HTTP.
- **`src/api/`** = typed `createServerFn` wrappers used by the React client. These are called like normal functions from components and are the thin front door to `src/server/services/`.

App code should almost always import from `src/api/`, not from here. Use this folder only when you need a URL an external service can POST or GET.
