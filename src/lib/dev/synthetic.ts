// Synthetic large dataset used to prove the globe scales. Enabled with the
// `?stress=1` URL flag (optionally `?stress=1&aircraft=20000&ships=20000&sats=5000`).
import type { AircraftEntity, Entity, SatelliteEntity, ShipEntity } from "@/data/mock/types";

// Deterministic PRNG so repeated runs are comparable.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dense hubs so clustering/adaptive density is actually exercised. */
const HUBS: Array<[number, number, number]> = [
  [51.5, -0.1, 0.35],
  [40.7, -74.0, 0.3],
  [1.29, 103.85, 0.45],
  [25.2, 55.3, 0.25],
  [35.6, 139.7, 0.3],
  [-33.9, 18.4, 0.15],
  [37.8, -122.4, 0.2],
  [19.4, -99.1, 0.15],
];

export interface StressOptions {
  aircraft?: number;
  ships?: number;
  satellites?: number;
  seed?: number;
}

export function generateStressDataset(opts: StressOptions = {}): Entity[] {
  const rand = mulberry32(opts.seed ?? 42);
  const now = new Date();
  const aircraftCount = opts.aircraft ?? 20000;
  const shipCount = opts.ships ?? 20000;
  const satCount = opts.satellites ?? 5000;
  const out: Entity[] = [];

  const place = (spread: number): [number, number] => {
    if (rand() < 0.65) {
      const hub = HUBS[Math.floor(rand() * HUBS.length)]!;
      const s = hub[2] * spread;
      return [
        Math.max(-85, Math.min(85, hub[0] + (rand() - 0.5) * 20 * s)),
        ((hub[1] + (rand() - 0.5) * 30 * s + 540) % 360) - 180,
      ];
    }
    return [(rand() - 0.5) * 160, (rand() - 0.5) * 360];
  };

  for (let i = 0; i < aircraftCount; i++) {
    const [lat, lon] = place(1);
    const military = rand() < 0.03;
    const ac: AircraftEntity = {
      id: `ac-syn${i}`,
      type: "aircraft",
      name: `SYN${1000 + i}`,
      lat,
      lon,
      updatedAt: now,
      icao24: `syn${i.toString(16)}`,
      callsign: `SYN${1000 + i}`,
      altitudeM: 2000 + Math.floor(rand() * 11000),
      velocityMs: 120 + Math.floor(rand() * 130),
      headingDeg: Math.floor(rand() * 360),
      verticalRateMs: 0,
      onGround: false,
      affiliation: military ? "Military" : "Commercial",
      classification: "Airborne",
      riskScore: military ? 65 + Math.floor(rand() * 30) : Math.floor(rand() * 40),
    };
    out.push(ac);
  }

  for (let i = 0; i < shipCount; i++) {
    const [lat, lon] = place(1.4);
    const sh: ShipEntity = {
      id: `sh-syn${i}`,
      type: "ship",
      name: `SYN VESSEL ${i}`,
      lat,
      lon,
      updatedAt: now,
      mmsi: `9${(100000000 + i).toString().slice(0, 8)}`,
      shipName: `SYN VESSEL ${i}`,
      speedKn: Math.round(rand() * 22 * 10) / 10,
      courseDeg: Math.floor(rand() * 360),
      headingDeg: Math.floor(rand() * 360),
      shipType: rand() < 0.02 ? "Military" : "Cargo",
      affiliation: "Unknown",
      classification: "Under way",
      riskScore: Math.floor(rand() * 50),
    };
    out.push(sh);
  }

  for (let i = 0; i < satCount; i++) {
    const [lat, lon] = [(rand() - 0.5) * 170, (rand() - 0.5) * 360];
    const sat: SatelliteEntity = {
      id: `sat-syn${i}`,
      type: "satellite",
      name: `SYNSAT ${i}`,
      lat,
      lon,
      updatedAt: now,
      noradId: 900000 + i,
      tleLine1: "",
      tleLine2: "",
      category: "synthetic",
      classification: `${400 + Math.floor(rand() * 600)} km orbit`,
      riskScore: 0,
    };
    out.push(sat);
  }

  return out;
}
