# domain — start here

Shared vocabulary of the app. Pure TypeScript: types, constants, strings and
rules. No React, no database, no network calls — anything here can be imported
from the browser and the server alike, and is trivially unit-testable.

| File / folder | Holds |
| --- | --- |
| `entities.ts` | The object model (aircraft, ship, satellite, launch, alerts, insights) |
| `console.ts` | UI-facing types (filters, layers, selection, facets) |
| `live.ts` | Database row shapes and snapshot/track request types |
| `ingest.ts` | Types shared by the ingestion providers |
| `constants.ts` | Tunable numbers: polling, limits, source attribution |
| `strings.ts` | Every user-facing label in one place |
| `insights/` | Detection rules — one file per detector under `detectors/` |

Adding a new alert type? Create one file in `insights/detectors/`, add its
thresholds to `insights/rules.ts`, and re-export it from `insights/index.ts`.
