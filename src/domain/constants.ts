/**
 * Application-wide constants. Anything a new developer might want to tune
 * (names, polling cadence, query budgets, attribution) lives here.
 */

export const APP_NAME = "OmniSky";

export const APP_TAGLINE = "Global Air, Sea & Space Intelligence";

export const APP_DESCRIPTION =
  "Live intelligence console tracking aircraft, vessels, satellites, and rocket launches across the globe.";

/** Data providers shown in the footer, one per tracked domain. */
export const SOURCE_ATTRIBUTION = [
  { label: "ADSB.lol", href: "https://adsb.lol", scope: "Aircraft" },
  { label: "AISStream", href: "https://aisstream.io", scope: "Vessels" },
  { label: "CelesTrak", href: "https://celestrak.org", scope: "Satellites" },
  { label: "Launch Library 2", href: "https://thespacedevs.com", scope: "Launches" },
] as const;

/** Client polling cadence for the live pipeline. */
export const LIVE_POLLING = {
  /** How often the browser pulls a fresh snapshot. */
  snapshotIntervalMs: 20_000,
  /** How often the browser asks the server to pull from providers. */
  refreshIntervalMs: 30_000,
  /** How often satellite TLEs are re-propagated locally. */
  propagateIntervalMs: 1_500,
  /** A feed older than this is reported as stale. */
  staleAfterMs: 5 * 60_000,
} as const;

/** Server-side row budgets for a single snapshot query. */
export const SNAPSHOT_LIMITS = {
  maxRows: 8_000,
  defaultRows: 3_000,
  minRows: 200,
  satellites: 800,
  launches: 60,
  trackPoints: 200,
} as const;

/** Minimum seconds between on-demand provider pulls, per source. */
export const ON_DEMAND_REFRESH_MIN_INTERVAL_S = 25;

/** Camera height the globe starts at, in metres. */
export const DEFAULT_CAMERA_HEIGHT_M = 24_000_000;

/** Maximum facet values shown per filter list. */
export const MAX_FACET_OPTIONS = 20;

/** Synthetic stress-test dataset defaults (`?stress=1`). */
export const STRESS_DEFAULTS = { aircraft: 20_000, ships: 20_000, satellites: 5_000 } as const;
