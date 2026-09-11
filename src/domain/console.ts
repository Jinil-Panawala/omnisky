import type {
  Entity,
  EntityType,
  TimelineEvent,
  ActiveAlert,
  AiInsight,
} from "@/data/mock";

export type { Entity, EntityType, TimelineEvent, ActiveAlert, AiInsight };

export type LayerVisibility = {
  aircraft: boolean;
  ship: boolean;
  satellite: boolean;
  launch: boolean;
};

export type Filters = {
  search: string;
  riskRange: [number, number];
  affiliations: string[];
  classifications: string[];
};

export type SelectedEntity = {
  entity: Entity;
  source?: "map" | "list" | "event";
} | null;
