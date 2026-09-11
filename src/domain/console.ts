/**
 * UI-level vocabulary for the console shell: what is visible, what is filtered,
 * what is selected. Pure types — no React, no side effects.
 */
import type {
  Entity,
  EntityType,
  TimelineEvent,
  ActiveAlert,
  AiInsight,
} from "./entities";

export type { Entity, EntityType, TimelineEvent, ActiveAlert, AiInsight };

/** Demo dataset vs. the live ingestion pipeline. */
export type DataMode = "demo" | "live";

/** Health of the live feed pipeline as surfaced in the top bar. */
export type FeedStatus = "connecting" | "live" | "stale" | "error";

export interface LayerVisibility {
  aircraft: boolean;
  ship: boolean;
  satellite: boolean;
  launch: boolean;
}

export interface Filters {
  search: string;
  riskRange: [number, number];
  affiliations: string[];
  classifications: string[];
}

export type SelectedEntity = {
  entity: Entity;
  source?: "map" | "list" | "event";
} | null;

/** Side/bottom panels the user can hide to widen the map. */
export interface PanelVisibility {
  filters: boolean;
  alerts: boolean;
  feed: boolean;
  details: boolean;
}

/** A facet value plus how many objects currently carry it. */
export interface FacetOption {
  value: string;
  count: number;
}

/** Geographic box the camera can currently see. */
export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** What the globe camera reports back to the page. */
export interface GlobeViewState {
  bounds: GeoBounds | null;
  heightM: number;
}
