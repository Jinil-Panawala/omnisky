/**
 * Pure detection rules for automatically generated alerts and AI insights.
 *
 * Nothing here touches the database or the network: detectors take plain rows
 * and return `InsightCandidate` objects. The AI step only rewrites the wording
 * of these candidates, so the console still works when AI is unavailable.
 */
import type { EntityType } from "./entities";

export type InsightKind = "alert" | "insight";
export type InsightSeverity = "critical" | "warning" | "info";
export type InsightCategory = "loitering" | "dark" | "activity" | "formation" | "launch";

/** A detected situation, before the AI wording pass. */
export interface InsightCandidate {
  kind: InsightKind;
  category: InsightCategory;
  severity: InsightSeverity;
  entityType: EntityType;
  entityId: string | null;
  title: string;
  description: string;
  signal: Record<string, unknown>;
  dedupKey: string;
}

/** A stored insight as the console consumes it. */
export interface InsightRecord {
  id: string;
  kind: InsightKind;
  category: InsightCategory;
  severity: InsightSeverity;
  entity_type: EntityType;
  entity_id: string | null;
  title: string;
  description: string;
  ai_generated: boolean;
  detected_at: string;
}

/** Tunable thresholds — one place for a new developer to adjust sensitivity. */
export const INSIGHT_RULES = {
  /** Aircraft loitering: circling inside a small radius for a long while. */
  loitering: { minPoints: 8, maxRadiusKm: 28, minMinutes: 40 },
  /** Vessels last seen underway that have since gone quiet on AIS. */
  dark: { minQuietMinutes: 35, maxQuietMinutes: 180, maxReports: 6 },
  /**
   * Real formations, not busy airspace: aircraft packed into a few km at a
   * shared altitude and heading.
   */
  formation: {
    cellDeg: 0.4,
    minCount: 4,
    minAltitudeM: 3000,
    maxSpreadKm: 15,
    maxAltitudeSpreadM: 1200,
    maxHeadingSpreadDeg: 30,
  },
  /** Global aircraft-count change versus the previous run. */
  activity: { minChangePct: 25, minBaseline: 300 },
  /** Launch windows opening or just closed. */
  launch: { aheadHours: 6, behindHours: 2 },
  /** Candidates carried into a single AI batch. */
  maxPerRun: 10,
  /** How long a generated insight stays on screen. */
  lifetimeHours: 3,
  /** Re-alerting the same situation is suppressed within this bucket. */
  dedupBucketMinutes: 60,
} as const;

export const INSIGHT_SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export interface HistoryPoint {
  craft_id: string;
  lat: number;
  lon: number;
  recorded_at: string;
}

export interface AircraftRow {
  icao24: string;
  callsign: string | null;
  lat: number | null;
  lon: number | null;
  altitude_m: number | null;
  heading_deg: number | null;
  on_ground: boolean | null;
  updated_at: string;
}

export interface VesselRow {
  mmsi: string;
  ship_name: string | null;
  lat: number | null;
  lon: number | null;
  speed_kn: number | null;
  updated_at: string;
}

/** Last known history fix for a vessel, used to spot AIS drop-outs. */
export interface VesselLastSeen {
  mmsi: string;
  lat: number;
  lon: number;
  lastSeenMs: number;
}

export interface LaunchRow {
  id: string;
  name: string;
  provider: string | null;
  pad_name: string | null;
  status: string | null;
  window_start: string | null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_KM = 6371;

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLon = (bLon - aLon) * toRad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

function bucket(now: number): string {
  return String(Math.floor(now / (INSIGHT_RULES.dedupBucketMinutes * 60_000)));
}

function dedupKey(category: InsightCategory, scope: string, now: number): string {
  return `${category}:${scope}:${bucket(now)}`;
}

function roundTo(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/* ------------------------------------------------------------------ */
/* Detectors                                                           */
/* ------------------------------------------------------------------ */

/** Aircraft that stayed inside a small radius for a long time (orbit/CAP). */
export function detectLoitering(points: HistoryPoint[], now: number): InsightCandidate[] {
  const { minPoints, maxRadiusKm, minMinutes } = INSIGHT_RULES.loitering;
  const byCraft = new Map<string, HistoryPoint[]>();
  for (const p of points) {
    const list = byCraft.get(p.craft_id);
    if (list) list.push(p);
    else byCraft.set(p.craft_id, [p]);
  }

  const out: InsightCandidate[] = [];
  for (const [craftId, track] of byCraft) {
    if (track.length < minPoints) continue;
    const first = new Date(track[0]!.recorded_at).getTime();
    const last = new Date(track[track.length - 1]!.recorded_at).getTime();
    const minutes = (last - first) / 60_000;
    if (minutes < minMinutes) continue;

    const lat = track.reduce((s, p) => s + p.lat, 0) / track.length;
    const lon = track.reduce((s, p) => s + p.lon, 0) / track.length;
    const radiusKm = track.reduce(
      (max, p) => Math.max(max, distanceKm(lat, lon, p.lat, p.lon)),
      0,
    );
    if (radiusKm > maxRadiusKm) continue;

    out.push({
      kind: "alert",
      category: "loitering",
      severity: minutes > 120 ? "warning" : "info",
      entityType: "aircraft",
      entityId: craftId,
      title: "Loitering Pattern Detected",
      description: `Aircraft ${craftId.toUpperCase()} held a ${roundTo(radiusKm)} km orbit for ${Math.round(minutes)} minutes near ${roundTo(lat, 2)}, ${roundTo(lon, 2)}.`,
      signal: {
        icao24: craftId,
        minutes: Math.round(minutes),
        radiusKm: roundTo(radiusKm),
        lat: roundTo(lat, 2),
        lon: roundTo(lon, 2),
        points: track.length,
      },
      dedupKey: dedupKey("loitering", craftId, now),
    });
  }
  return out;
}

/**
 * Vessels whose AIS track stops: they appear in recent history but no longer
 * report a live position. Live rows expire on a short TTL, so absence from the
 * live table is the signal, not a stale timestamp.
 */
export function detectDarkVessels(
  lastSeen: VesselLastSeen[],
  activeMmsi: Set<string>,
  now: number,
): InsightCandidate[] {
  const { minQuietMinutes, maxQuietMinutes, maxReports } = INSIGHT_RULES.dark;
  const out: InsightCandidate[] = [];
  for (const v of lastSeen) {
    if (activeMmsi.has(v.mmsi)) continue;
    const quietMinutes = (now - v.lastSeenMs) / 60_000;
    if (quietMinutes < minQuietMinutes || quietMinutes > maxQuietMinutes) continue;
    out.push({
      kind: "alert",
      category: "dark",
      severity: quietMinutes > 90 ? "critical" : "warning",
      entityType: "ship",
      entityId: v.mmsi,
      title: "AIS Signal Lost",
      description: `Vessel MMSI ${v.mmsi} stopped broadcasting AIS ${Math.round(quietMinutes)} minutes ago; last fix near ${roundTo(v.lat, 2)}, ${roundTo(v.lon, 2)}.`,
      signal: {
        mmsi: v.mmsi,
        quietMinutes: Math.round(quietMinutes),
        lat: roundTo(v.lat, 2),
        lon: roundTo(v.lon, 2),
      },
      dedupKey: dedupKey("dark", v.mmsi, now),
    });
    if (out.length >= maxReports) break;
  }
  return out;
}

/** Aircraft flying as a tight group: close together, same altitude and heading. */
export function detectFormations(aircraft: AircraftRow[], now: number): InsightCandidate[] {
  const {
    cellDeg,
    minCount,
    minAltitudeM,
    maxSpreadKm,
    maxAltitudeSpreadM,
    maxHeadingSpreadDeg,
  } = INSIGHT_RULES.formation;

  // Grid cells are only a cheap pre-filter; the real test is the tightness
  // check below, so ordinary busy airspace does not raise an insight.
  const cells = new Map<string, AircraftRow[]>();
  for (const a of aircraft) {
    if (a.lat == null || a.lon == null || a.on_ground) continue;
    if ((a.altitude_m ?? 0) < minAltitudeM || a.heading_deg == null) continue;
    const key = `${Math.floor(a.lat / cellDeg)}|${Math.floor(a.lon / cellDeg)}`;
    const list = cells.get(key);
    if (list) list.push(a);
    else cells.set(key, [a]);
  }

  const out: InsightCandidate[] = [];
  for (const [key, cell] of cells) {
    if (cell.length < minCount) continue;
    const group = tightestGroup(cell, maxSpreadKm, maxAltitudeSpreadM, maxHeadingSpreadDeg);
    if (group.length < minCount) continue;

    const lat = group.reduce((s, a) => s + (a.lat ?? 0), 0) / group.length;
    const lon = group.reduce((s, a) => s + (a.lon ?? 0), 0) / group.length;
    const altitudeM = Math.round(
      group.reduce((s, a) => s + (a.altitude_m ?? 0), 0) / group.length,
    );
    const callsigns = group
      .map((a) => a.callsign?.trim())
      .filter((c): c is string => Boolean(c))
      .slice(0, 6);

    out.push({
      kind: "insight",
      category: "formation",
      severity: group.length >= minCount * 2 ? "warning" : "info",
      entityType: "aircraft",
      entityId: group[0]!.icao24,
      title: "Aircraft Flying in Formation",
      description: `${group.length} aircraft are holding station within ${maxSpreadKm} km at about ${altitudeM} m on a common heading near ${roundTo(lat, 2)}, ${roundTo(lon, 2)}.`,
      signal: {
        count: group.length,
        lat: roundTo(lat, 2),
        lon: roundTo(lon, 2),
        altitudeM,
        headingDeg: Math.round(group[0]!.heading_deg ?? 0),
        callsigns,
      },
      dedupKey: dedupKey("formation", key, now),
    });
  }
  return out;
}

/** Largest subset of a cell that is close, co-altitude and co-heading. */
function tightestGroup(
  cell: AircraftRow[],
  maxSpreadKm: number,
  maxAltitudeSpreadM: number,
  maxHeadingSpreadDeg: number,
): AircraftRow[] {
  let best: AircraftRow[] = [];
  for (const seed of cell) {
    const group = cell.filter(
      (a) =>
        distanceKm(seed.lat!, seed.lon!, a.lat!, a.lon!) <= maxSpreadKm &&
        Math.abs((a.altitude_m ?? 0) - (seed.altitude_m ?? 0)) <= maxAltitudeSpreadM &&
        headingDelta(a.heading_deg ?? 0, seed.heading_deg ?? 0) <= maxHeadingSpreadDeg,
    );
    if (group.length > best.length) best = group;
  }
  return best;
}

function headingDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Launch windows opening shortly or just closed. */
export function detectLaunchWindows(launches: LaunchRow[], now: number): InsightCandidate[] {
  const { aheadHours, behindHours } = INSIGHT_RULES.launch;
  const out: InsightCandidate[] = [];
  for (const l of launches) {
    if (!l.window_start) continue;
    const deltaH = (new Date(l.window_start).getTime() - now) / 3_600_000;
    if (deltaH > aheadHours || deltaH < -behindHours) continue;
    const when =
      deltaH >= 0 ? `opens in ${Math.round(deltaH * 60)} minutes` : `opened ${Math.round(-deltaH * 60)} minutes ago`;
    out.push({
      kind: "alert",
      category: "launch",
      severity: Math.abs(deltaH) < 1 ? "warning" : "info",
      entityType: "launch",
      entityId: l.id,
      title: "Launch Window Active",
      description: `${l.name} (${l.provider ?? "unknown provider"}) window ${when} from ${l.pad_name ?? "an undisclosed pad"}. Status: ${l.status ?? "unknown"}.`,
      signal: {
        launchId: l.id,
        name: l.name,
        provider: l.provider,
        pad: l.pad_name,
        status: l.status,
        hoursToWindow: roundTo(deltaH),
      },
      dedupKey: dedupKey("launch", l.id, now),
    });
  }
  return out;
}

/** Global tracked-aircraft volume compared with the previous run. */
export function detectActivitySpike(
  current: number,
  baseline: number | null,
  now: number,
): InsightCandidate[] {
  const { minChangePct, minBaseline } = INSIGHT_RULES.activity;
  if (!baseline || baseline < minBaseline) return [];
  const changePct = ((current - baseline) / baseline) * 100;
  if (Math.abs(changePct) < minChangePct) return [];
  const direction = changePct > 0 ? "increase" : "decrease";
  return [
    {
      kind: "insight",
      category: "activity",
      severity: Math.abs(changePct) > 50 ? "warning" : "info",
      entityType: "aircraft",
      entityId: null,
      title: "Tracked Air Activity Shift",
      description: `Tracked aircraft volume shows a ${Math.abs(Math.round(changePct))}% ${direction} versus the previous sweep (${baseline} → ${current}).`,
      signal: { current, baseline, changePct: Math.round(changePct) },
      dedupKey: dedupKey("activity", "global", now),
    },
  ];
}

/** Highest-severity candidates first, capped for a single AI batch. */
export function rankCandidates(
  candidates: InsightCandidate[],
  max = INSIGHT_RULES.maxPerRun,
): InsightCandidate[] {
  return [...candidates]
    .sort((a, b) => INSIGHT_SEVERITY_RANK[a.severity] - INSIGHT_SEVERITY_RANK[b.severity])
    .slice(0, max);
}
