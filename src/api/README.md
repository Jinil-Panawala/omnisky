# api — start here

The only backend surface the browser is allowed to call. Each file exports thin
`createServerFn` wrappers that validate input and delegate straight to a service
in `src/server/services/`.

Rules:

- No business logic here — keep handlers a few lines long.
- No direct database queries — call a service, which calls the query layer.
- External callers (webhooks, cron) do **not** use these; they hit the HTTP
  routes under `src/routes/api/public/`.
