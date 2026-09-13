import { describe, expect, it } from "vitest";
import { MotionStore } from "@/lib/geo/motion";

describe("MotionStore", () => {
  it("reports the first fix exactly", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: 10, lon: 20 }], 0);
    expect(store.sample("a")).toEqual({ lat: 10, lon: 20 });
  });

  it("returns null for unknown objects", () => {
    expect(new MotionStore().sample("nope")).toBeNull();
  });

  it("eases toward a new fix instead of jumping", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: 0, lon: 0 }], 0);
    store.sync([{ id: "a", lat: 1, lon: 0 }], 100);
    store.tick(100);
    store.tick(200);
    const s = store.sample("a")!;
    expect(s.lat).toBeGreaterThan(0);
    expect(s.lat).toBeLessThan(1);
  });

  it("converges on the target after enough ticks", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: 0, lon: 0 }], 0);
    store.sync([{ id: "a", lat: 1, lon: 0 }], 100);
    for (let t = 200; t <= 5000; t += 100) store.tick(t);
    expect(store.sample("a")!.lat).toBeCloseTo(1, 2);
  });

  it("snaps when an object moves an implausible distance", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: 0, lon: 0 }], 0);
    store.sync([{ id: "a", lat: 40, lon: 0 }], 100);
    expect(store.sample("a")!.lat).toBe(40);
  });

  it("keeps longitude wrapped across the antimeridian", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: 0, lon: 179.5 }], 0);
    store.sync([{ id: "a", lat: 0, lon: -179.5 }], 100);
    for (let t = 200; t <= 3000; t += 100) store.tick(t);
    const lon = store.sample("a")!.lon;
    expect(lon).toBeLessThanOrEqual(180);
    expect(lon).toBeGreaterThanOrEqual(-180);
    expect(Math.abs(lon)).toBeGreaterThan(179);
  });

  it("dead-reckons a moving object between fixes", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: 0, lon: 0, headingDeg: 0, speedMs: 250 }], 0);
    for (let t = 100; t <= 3000; t += 100) store.tick(t);
    expect(store.sample("a")!.lat).toBeGreaterThan(0);
  });

  it("does not extrapolate when asked not to", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: 0, lon: 0, headingDeg: 0, speedMs: 250, extrapolate: false }], 0);
    for (let t = 100; t <= 3000; t += 100) store.tick(t);
    expect(store.sample("a")!.lat).toBeCloseTo(0, 6);
  });

  it("forgets objects that stop being reported", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: 0, lon: 0 }], 0);
    store.sync([{ id: "b", lat: 1, lon: 1 }], 100);
    expect(store.sample("a")).toBeNull();
    expect(store.sample("b")).not.toBeNull();
  });

  it("ignores non-finite coordinates", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: Number.NaN, lon: 0 }], 0);
    expect(store.sample("a")).toBeNull();
  });

  it("clears all state", () => {
    const store = new MotionStore();
    store.sync([{ id: "a", lat: 0, lon: 0 }], 0);
    store.clear();
    expect(store.sample("a")).toBeNull();
  });
});
