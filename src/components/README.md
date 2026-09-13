# components — start here

| Folder | Holds |
| --- | --- |
| `console/layout/` | Frame of the app: top bar, counters, control rail, filters, footer |
| `console/globe/` | The Cesium globe and its icon helpers (browser-only, loaded lazily) |
| `console/panels/` | Side panels: details, feed, alerts, AI insights |
| `ui/` | shadcn primitives — generated, avoid hand-editing |

`console/index.ts` is the public surface: import console pieces from
`@/components/console`, not from their individual files. User-facing text comes
from `@/domain/strings`; colors come from design tokens, never hard-coded.
