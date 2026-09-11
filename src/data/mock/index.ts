import { aircraft } from "./aircraft";
import { vessels } from "./vessels";
import { satellites } from "./satellites";
import { launches } from "./launches";
import { events } from "./events";
import { alerts } from "./alerts";
import { insights } from "./insights";
import type {
  AircraftEntity,
  ShipEntity,
  SatelliteEntity,
  LaunchEntity,
  Entity,
  EntityType,
  NearbyEntity,
  MockDataset,
} from "./types";

export * from "./types";

export const mockDataset: MockDataset = {
  aircraft,
  ships: vessels,
  satellites,
  launches,
  events,
  alerts,
  insights,
};

export function getEntityById(id: string, type?: EntityType): Entity | undefined {
  if (type === "aircraft" || !type) {
    const found = aircraft.find((a) => a.id === id);
    if (found) return found;
  }
  if (type === "ship" || !type) {
    const found = vessels.find((v) => v.id === id);
    if (found) return found;
  }
  if (type === "satellite" || !type) {
    const found = satellites.find((s) => s.id === id);
    if (found) return found;
  }
  if (type === "launch" || !type) {
    const found = launches.find((l) => l.id === id);
    if (found) return found;
  }
  return undefined;
}

export function getNearbyEntities(entity: Entity, limit = 3): NearbyEntity[] {
  const all: Entity[] = [...aircraft, ...vessels, ...satellites, ...launches].filter(
    (e) => e.id !== entity.id
  );
  const withDistance = all
    .map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      distanceNm: haversineNm(entity.lat, entity.lon, e.lat, e.lon),
    }))
    .sort((a, b) => a.distanceNm - b.distanceNm)
    .slice(0, limit);
  return withDistance;
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toGeoJSON(entities: Entity[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: entities.map((e) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [e.lon, e.lat],
      },
      properties: {
        id: e.id,
        type: e.type,
        name: e.name,
        riskScore: "riskScore" in e ? e.riskScore : 0,
      },
    })),
  };
}

export function getCounts(): {
  aircraft: number;
  ships: number;
  satellites: number;
  launches: number;
  alerts: number;
} {
  return {
    aircraft: aircraft.length,
    ships: vessels.length,
    satellites: satellites.length,
    launches: launches.length,
    alerts: alerts.length,
  };
}

export type { AircraftEntity, ShipEntity, SatelliteEntity, LaunchEntity, Entity, EntityType };
