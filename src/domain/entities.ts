export type EntityType = "aircraft" | "ship" | "satellite" | "launch" | "alert";

export interface BaseEntity {
  id: string;
  type: EntityType;
  name: string;
  lat: number;
  lon: number;
  updatedAt: Date;
}

export interface AircraftEntity extends BaseEntity {
  type: "aircraft";
  icao24: string;
  callsign: string;
  altitudeM: number | null;
  velocityMs: number | null;
  headingDeg: number | null;
  verticalRateMs: number | null;
  onGround: boolean;
  affiliation: string;
  classification: string;
  riskScore: number;
}

export interface ShipEntity extends BaseEntity {
  type: "ship";
  mmsi: string;
  shipName: string;
  speedKn: number | null;
  courseDeg: number | null;
  headingDeg: number | null;
  shipType: string | null;
  affiliation: string;
  classification: string;
  riskScore: number;
}

export interface SatelliteEntity extends BaseEntity {
  type: "satellite";
  noradId: number;
  tleLine1: string;
  tleLine2: string;
  category: string;
  classification: string;
  riskScore: number;
}

export interface LaunchEntity extends BaseEntity {
  type: "launch";
  rocket: string;
  mission: string;
  provider: string;
  padName: string;
  windowStart: Date;
  windowEnd: Date;
  status: string;
  classification: string;
  riskScore: number;
}

export type Entity = AircraftEntity | ShipEntity | SatelliteEntity | LaunchEntity;

export interface NearbyEntity {
  id: string;
  type: EntityType;
  name: string;
  distanceNm: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: EntityType;
  entityId: string;
  title: string;
  description: string;
  bookmarked?: boolean;
}

export interface ActiveAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  type: EntityType;
  title: string;
  description: string;
  timestamp: Date;
  entityId: string;
}

export interface AiInsight {
  id: string;
  category: "loitering" | "dark" | "activity" | "formation" | "launch";
  title: string;
  description: string;
  timestamp: Date;
  severity: "critical" | "warning" | "info";
}

export interface MockDataset {
  aircraft: AircraftEntity[];
  ships: ShipEntity[];
  satellites: SatelliteEntity[];
  launches: LaunchEntity[];
  events: TimelineEvent[];
  alerts: ActiveAlert[];
  insights: AiInsight[];
}
