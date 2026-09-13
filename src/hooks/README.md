# hooks — start here

React state for the console. Each hook owns one concern so the page components
stay declarative.

| Hook | Owns |
| --- | --- |
| `useLiveEntities` | Polling the live snapshot and turning rows into entities |
| `useInsightFeed` | Polling generated alerts and AI insights |
| `useSelectedTrack` | Fetching the history trail of the selected object |
| `useConsoleDataset` | Pure derivation: filtered entities, counters, filter facets |
| `useConsoleFlags` | Developer URL flags (`?stress=1`, `?stats=1`) |
| `useConsoleSettings` | Default layers, panels and refresh rate (saved when signed in) |
| `usePanelVisibility` | Which side panels are open |
| `useAuth` | Session state and sign-out |
| `useProfile` | Profile row, avatar upload, digest preference |
| `useDailyDigest` | The latest published daily digest |
| `useMobile` | Responsive breakpoint helper |
