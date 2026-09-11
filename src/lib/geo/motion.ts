// Smooth movement between position updates.
//
// Feeds arrive every few seconds, so drawing raw positions makes objects jump.
// This store keeps a display position per object that (a) dead-reckons forward
// from the last known heading/speed and (b) eases toward each new fix instead of
// snapping to it. It is renderer-agnostic: give it objects, ask for positions.

export interface MotionInput {
  id: string;
  lat: number;
  lon: number;
  /** Course over ground in degrees, 0 = north. */
  headingDeg?: number | null;
  /** Ground speed in metres per second. */
  speedMs?: number | null;
  /** Whether dead-reckoning should be applied at all (satellites are propagated upstream). */
  extrapolate?: boolean;
  updatedAt?: number;
}

export interface MotionSample {
  lat: number;
  lon: number;
}

interface MotionState {
  dispLat: number;
  dispLon: number;
  tgtLat: number;
  tgtLon: number;
  headingDeg: number | null;
  speedMs: number;
  extrapolate: boolean;
  fixLat: number;
  fixLon: number;
  fixAt: number;
  seenAt: number;
}

const EARTH_R = 6_371_000;
/** Easing time constant: ~1 s to close most of the gap to a new fix. */
const TAU_MS = 700;
/** Beyond this, the object really did move somewhere else — snap. */
const SNAP_DEG = 2.5;
/** Never dead-reckon further than this past the last fix. */
const MAX_EXTRAPOLATE_MS = 30_000;

function wrapLon(lon: number): number {
  let l = lon;
  while (l > 180) l -= 360;
  while (l < -180) l += 360;
  return l;
}

/** Shortest signed difference between two longitudes, antimeridian-safe. */
function lonDelta(from: number, to: number): number {
  return wrapLon(to - from);
}

export class MotionStore {
  private states = new Map<string, MotionState>();
  private lastTick = 0;

  /** Feed the latest known fixes. Objects absent from the list are forgotten. */
  sync(inputs: MotionInput[], now = performance.now()): void {
    for (const input of inputs) {
      if (!Number.isFinite(input.lat) || !Number.isFinite(input.lon)) continue;
      const existing = this.states.get(input.id);
      const speedMs = Math.max(0, input.speedMs ?? 0);
      const extrapolate = input.extrapolate !== false && speedMs > 0.5;

      if (!existing) {
        this.states.set(input.id, {
          dispLat: input.lat,
          dispLon: input.lon,
          tgtLat: input.lat,
          tgtLon: input.lon,
          headingDeg: input.headingDeg ?? null,
          speedMs,
          extrapolate,
          fixLat: input.lat,
          fixLon: input.lon,
          fixAt: now,
          seenAt: now,
        });
        continue;
      }

      existing.seenAt = now;
      existing.speedMs = speedMs;
      existing.extrapolate = extrapolate;
      existing.headingDeg = input.headingDeg ?? existing.headingDeg;

      const moved =
        Math.abs(input.lat - existing.fixLat) > 1e-7 ||
        Math.abs(lonDelta(existing.fixLon, input.lon)) > 1e-7;
      if (!moved) continue;

      existing.fixLat = input.lat;
      existing.fixLon = input.lon;
      existing.fixAt = now;

      const jump =
        Math.abs(input.lat - existing.dispLat) +
        Math.abs(lonDelta(existing.dispLon, input.lon));
      if (jump > SNAP_DEG) {
        existing.dispLat = input.lat;
        existing.dispLon = input.lon;
      }
      existing.tgtLat = input.lat;
      existing.tgtLon = input.lon;
    }

    // Drop anything that stopped being reported.
    for (const [id, state] of this.states) {
      if (state.seenAt !== now) this.states.delete(id);
    }
  }

  /** Advance display positions toward their targets. Call once per frame. */
  tick(now = performance.now()): void {
    const dt = this.lastTick === 0 ? 16 : Math.min(1000, now - this.lastTick);
    this.lastTick = now;
    if (dt <= 0) return;
    const ease = 1 - Math.exp(-dt / TAU_MS);

    for (const state of this.states.values()) {
      if (state.extrapolate && state.headingDeg != null) {
        // Dead-reckon the target so motion continues between fixes.
        const age = now - state.fixAt;
        if (age < MAX_EXTRAPOLATE_MS) {
          const dist = (state.speedMs * dt) / 1000;
          const rad = (state.headingDeg * Math.PI) / 180;
          const dLat = ((dist * Math.cos(rad)) / EARTH_R) * (180 / Math.PI);
          const cosLat = Math.max(0.05, Math.cos((state.tgtLat * Math.PI) / 180));
          const dLon =
            ((dist * Math.sin(rad)) / (EARTH_R * cosLat)) * (180 / Math.PI);
          state.tgtLat = Math.max(-89.9, Math.min(89.9, state.tgtLat + dLat));
          state.tgtLon = wrapLon(state.tgtLon + dLon);
        }
      }
      state.dispLat += (state.tgtLat - state.dispLat) * ease;
      state.dispLon = wrapLon(
        state.dispLon + lonDelta(state.dispLon, state.tgtLon) * ease,
      );
    }
  }

  /** Current smoothed position, or null when the object is unknown. */
  sample(id: string): MotionSample | null {
    const state = this.states.get(id);
    if (!state) return null;
    return { lat: state.dispLat, lon: state.dispLon };
  }

  clear(): void {
    this.states.clear();
    this.lastTick = 0;
  }
}
