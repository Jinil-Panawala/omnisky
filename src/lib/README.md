# lib — start here

Client-safe shared utilities. Pure logic with no database access and no
secrets, safe to import from any component.

| Folder | Holds |
| --- | --- |
| `geo/spatial.ts` | Viewport culling, zoom level-of-detail, grid clustering, render budget |
| `geo/motion.ts` | Smooth movement between position updates (easing + dead reckoning) |
| `live/adapters.ts` | Database rows → the shared `Entity` model the UI renders |
| `dev/synthetic.ts` | Synthetic stress dataset for `?stress=1` |
| `utils.ts` | Small generic helpers (class name merge) |

Anything that queries the database or reads a secret belongs in `src/server/`,
not here.
