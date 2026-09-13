import { describe, expect, it } from "vitest";
import {
  aircraftFromRow,
  isFresh,
  launchFromRow,
  satelliteFromRow,
  vesselFromRow,
} from "@/lib/live/adapters";

const UPDATED = "2026-01-01T12:00:00Z";

describe("aircraftFromRow", () => {
  it("maps a row to an aircraft entity", () => {
    const e = aircraftFromRow({
      icao24: "abc123",
      callsign: " UAL933 ",
      lat: 51,
      lon: -1,
      altitude_m: 11_000,
      velocity_ms: 240,
      heading_deg: 270,
      vertical_rate_ms: 0,
      on_ground: false,
      updated_at: UPDATED,
    })!;
    expect(e.id).toBe("ac-abc123");
    expect(e.callsign).toBe("UAL933");
    expect(e.classification).toBe("Airborne");
  });

  it("falls back to the hex id when no callsign is reported", () => {
    const e = aircraftFromRow({
      icao24: "abc123",
      callsign: null,
      lat: 0,
      lon: 0,
      altitude_m: null,
      velocity_ms: null,
      heading_deg: null,
      vertical_rate_ms: null,
      on_ground: true,
      updated_at: UPDATED,
    })!;
    expect(e.name).toBe("ABC123");
    expect(e.classification).toBe("On ground");
  });

  it("drops rows without a position", () => {
    expect(
      aircraftFromRow({
        icao24: "abc123",
        callsign: null,
        lat: null,
        lon: null,
        altitude_m: null,
        velocity_ms: null,
        heading_deg: null,
        vertical_rate_ms: null,
        on_ground: null,
        updated_at: UPDATED,
      }),
    ).toBeNull();
  });
});

describe("vesselFromRow", () => {
  it("names unnamed vessels by MMSI and marks movement", () => {
    const moving = vesselFromRow({
      mmsi: "244110352",
      ship_name: null,
      lat: 52,
      lon: 4,
      speed_kn: 12,
      course_deg: 90,
      heading_deg: 90,
      ship_type: "Cargo",
      updated_at: UPDATED,
    })!;
    expect(moving.name).toBe("MMSI 244110352");
    expect(moving.classification).toBe("Under way");

    const idle = vesselFromRow({
      mmsi: "1",
      ship_name: "Aurora",
      lat: 0,
      lon: 0,
      speed_kn: 0,
      course_deg: null,
      heading_deg: null,
      ship_type: null,
      updated_at: UPDATED,
    })!;
    expect(idle.classification).toBe("Stationary");
  });
});

describe("satelliteFromRow", () => {
  it("uses the propagated position and orbit label", () => {
    const e = satelliteFromRow(
      {
        norad_id: 25544,
        name: "ISS",
        tle_line1: "1",
        tle_line2: "2",
        category: "station",
        updated_at: UPDATED,
      },
      { lat: 10, lon: 20, altitudeKm: 419.4 },
    );
    expect(e.id).toBe("sat-25544");
    expect(e.classification).toBe("419 km orbit");
  });
});

describe("launchFromRow", () => {
  it("drops launches without pad coordinates", () => {
    expect(
      launchFromRow({
        id: "l1",
        name: "Flight",
        rocket: null,
        mission: null,
        provider: null,
        pad_name: null,
        pad_lat: null,
        pad_lon: null,
        window_start: null,
        window_end: null,
        status: null,
        updated_at: UPDATED,
      }),
    ).toBeNull();
  });

  it("fills sensible defaults", () => {
    const e = launchFromRow({
      id: "l1",
      name: "Flight",
      rocket: null,
      mission: null,
      provider: null,
      pad_name: null,
      pad_lat: 28.5,
      pad_lon: -80.6,
      window_start: "2026-02-01T00:00:00Z",
      window_end: null,
      status: "Go",
      updated_at: UPDATED,
    })!;
    expect(e.id).toBe("ln-l1");
    expect(e.rocket).toBe("Unknown rocket");
    expect(e.windowEnd.getTime()).toBe(e.windowStart.getTime());
  });
});

describe("isFresh", () => {
  it("distinguishes recent from stale objects", () => {
    const base = { id: "x", type: "aircraft", name: "x", lat: 0, lon: 0 } as never;
    expect(isFresh({ ...(base as object), updatedAt: new Date() } as never)).toBe(true);
    expect(
      isFresh({ ...(base as object), updatedAt: new Date(Date.now() - 60 * 60_000) } as never),
    ).toBe(false);
  });
});
