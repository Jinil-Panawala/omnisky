# server — start here

Backend code. Never imported by a component directly; the browser reaches it
only through the server functions in `src/api/`.

| Folder | Holds |
| --- | --- |
| `db/` | The query layer: one repository per table group, plus the Supabase clients |
| `services/` | Business logic — composes `domain` rules with `db` queries |
| `http/` | Shared guards/response helpers reused by the routes in `src/routes/api/` |

Layering rule: `domain` → `db` → `services` → `api`. A service may call the
query layer; the query layer never calls a service. Files end in `.server.ts`
so the bundler keeps them out of the browser build.
