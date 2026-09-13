# server — start here

Backend code. Never imported by a component directly; the browser reaches it
only through the server functions in `src/api/`.

| Folder | Holds |
| --- | --- |
| `db/` | The query layer: one repository per table group, plus the Supabase clients |
| `services/` | Business logic — composes `domain` rules with `db` queries |
| `http/` | Shared guards/response helpers reused by the routes in `src/routes/api/` |
| `observability/` | The `log` helper — every backend message goes through it |

Layering rule: `domain` → `db` → `services` → `api`. A service may call the
query layer; the query layer never calls a service. Files end in `.server.ts`
so the bundler keeps them out of the browser build.

Two shared helpers keep the repositories consistent:

- `db/query.server.ts` — `rows()`, `row()` and `mutate()` run a Supabase query,
  log any database error instead of silently returning nothing, and apply the
  row-type cast in one place.
- `observability/log.server.ts` — `log.info/warn/error`, tagged with a scope
  such as `ingest.aircraft`, so logs are greppable. No bare `console.*` here.
