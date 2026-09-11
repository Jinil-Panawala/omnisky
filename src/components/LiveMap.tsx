import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as sat from "satellite.js";
import { supabase } from "@/integrations/supabase/client";

type LayerKey = "aircraft" | "vessels" | "satellites" | "launches";

interface Selection {
  type: LayerKey;
  title: string;
  rows: Array<[string, string]>;
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const LAYER_COLORS: Record<LayerKey, string> = {
  aircraft: "#fbbf24",
  vessels: "#38bdf8",
  satellites: "#e879f9",
  launches: "#f87171",
};

interface SatRec {
  rec: sat.SatRec;
  name: string;
  norad: number;
}

function fmt(value: number | null | undefined, unit: string, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value))
    return "—";
  return `${value.toFixed(digits)} ${unit}`;
}

export default function LiveMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const aircraftRef = useRef(new Map<string, GeoJSON.Feature>());
  const vesselsRef = useRef(new Map<string, GeoJSON.Feature>());
  const satsRef = useRef<SatRec[]>([]);
  const launchesRef = useRef<GeoJSON.Feature[]>([]);
  const launchMetaRef = useRef(new Map<string, Record<string, unknown>>());
  const [ready, setReady] = useState(false);
  const [counts, setCounts] = useState<Record<LayerKey, number>>({
    aircraft: 0,
    vessels: 0,
    satellites: 0,
    launches: 0,
  });
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    aircraft: true,
    vessels: true,
    satellites: true,
    launches: true,
  });
  const [selection, setSelection] = useState<Selection | null>(null);

  // Push current in-memory data into the map sources
  const flush = (map: maplibregl.Map) => {
    const setData = (id: string, fc: GeoJSON.FeatureCollection) => {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      src?.setData(fc);
    };
    setData("aircraft", {
      type: "FeatureCollection",
      features: [...aircraftRef.current.values()],
    });
    setData("vessels", {
      type: "FeatureCollection",
      features: [...vesselsRef.current.values()],
    });
    setData("launches", {
      type: "FeatureCollection",
      features: launchesRef.current,
    });
    setCounts((c) => ({
      ...c,
      aircraft: aircraftRef.current.size,
      vessels: vesselsRef.current.size,
      launches: launchesRef.current.length,
    }));
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [0, 25],
      zoom: 2,
      attributionControl: {},
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      for (const key of Object.keys(LAYER_COLORS) as LayerKey[]) {
        map.addSource(key, { type: "geojson", data: EMPTY_FC });
      }
      const circle = (id: LayerKey, radius: number, opacity = 0.9) => {
        map.addLayer({
          id,
          type: "circle",
          source: id,
          paint: {
            "circle-radius": radius,
            "circle-color": LAYER_COLORS[id],
            "circle-opacity": opacity,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#0b0f19",
          },
        });
      };
      circle("aircraft", 3);
      circle("vessels", 3);
      circle("satellites", 2.5);
      map.addLayer({
        id: "launches",
        type: "circle",
        source: "launches",
        paint: {
          "circle-radius": 8,
          "circle-color": "transparent",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": LAYER_COLORS.launches,
          "circle-stroke-opacity": [
            "case",
            ["boolean", ["get", "upcoming"], false],
            1,
            0.35,
          ],
        },
      });

      for (const layer of [
        "aircraft",
        "vessels",
        "satellites",
        "launches",
      ] as const) {
        map.on("click", layer, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties ?? {};
          if (layer === "aircraft") {
            setSelection({
              type: "aircraft",
              title: p.callsign || p.id,
              rows: [
                ["ICAO24", String(p.id)],
                ["Altitude", fmt(p.altitude_m, "m")],
                ["Speed", fmt(p.velocity_ms, "m/s")],
                ["Heading", fmt(p.heading_deg, "°")],
                ["On ground", p.on_ground ? "Yes" : "No"],
              ],
            });
          } else if (layer === "vessels") {
            setSelection({
              type: "vessels",
              title: p.ship_name || `MMSI ${p.id}`,
              rows: [
                ["MMSI", String(p.id)],
                ["Speed", fmt(p.speed_kn, "kn", 1)],
                ["Course", fmt(p.course_deg, "°")],
                ["Heading", fmt(p.heading_deg, "°")],
              ],
            });
          } else if (layer === "satellites") {
            setSelection({
              type: "satellites",
              title: p.name,
              rows: [
                ["NORAD ID", String(p.id)],
                ["Category", String(p.category ?? "—")],
                ["Altitude", fmt(p.altitude_km, "km")],
                ["Velocity", fmt(p.velocity_kms, "km/s", 2)],
              ],
            });
          } else {
            const meta = launchMetaRef.current.get(String(p.id));
            const ws = meta?.window_start
              ? new Date(String(meta.window_start)).toLocaleString()
              : "—";
            setSelection({
              type: "launches",
              title: String(p.name ?? "Launch"),
              rows: [
                ["Rocket", String(meta?.rocket ?? "—")],
                ["Provider", String(meta?.provider ?? "—")],
                ["Pad", String(meta?.pad_name ?? "—")],
                ["Window opens", ws],
                ["Status", String(meta?.status ?? "—")],
              ],
            });
          }
        });
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const key of Object.keys(visible) as LayerKey[]) {
      if (map.getLayer(key)) {
        map.setLayoutProperty(
          key,
          "visibility",
          visible[key] ? "visible" : "none",
        );
      }
    }
  }, [visible, ready]);

  // Initial data + realtime subscriptions
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    const loadAircraft = async () => {
      const { data } = await supabase
        .from("aircraft_positions")
        .select("*");
      if (cancelled || !data) return;
      aircraftRef.current.clear();
      for (const r of data) {
        aircraftRef.current.set(r.icao24, {
          type: "Feature",
          geometry: { type: "Point", coordinates: [r.lon, r.lat] },
          properties: {
            id: r.icao24,
            callsign: r.callsign,
            altitude_m: r.altitude_m,
            velocity_ms: r.velocity_ms,
            heading_deg: r.heading_deg,
            on_ground: r.on_ground,
          },
        });
      }
      flush(map);
    };
    const loadVessels = async () => {
      const { data } = await supabase.from("vessel_positions").select("*");
      if (cancelled || !data) return;
      vesselsRef.current.clear();
      for (const r of data) {
        vesselsRef.current.set(r.mmsi, {
          type: "Feature",
          geometry: { type: "Point", coordinates: [r.lon, r.lat] },
          properties: {
            id: r.mmsi,
            ship_name: r.ship_name,
            speed_kn: r.speed_kn,
            course_deg: r.course_deg,
            heading_deg: r.heading_deg,
          },
        });
      }
      flush(map);
    };
    const loadSats = async () => {
      const { data } = await supabase
        .from("satellite_tles")
        .select("norad_id,name,tle_line1,tle_line2,category");
      if (cancelled || !data) return;
      satsRef.current = data.flatMap((r) => {
        try {
          const rec = sat.twoline2satrec(r.tle_line1, r.tle_line2);
          return [{ rec, name: r.name, norad: r.norad_id }];
        } catch {
          return [];
        }
      });
      setCounts((c) => ({ ...c, satellites: satsRef.current.length }));
    };
    const loadLaunches = async () => {
      const { data } = await supabase.from("launches").select("*");
      if (cancelled || !data) return;
      const now = Date.now();
      launchesRef.current = data
        .filter((r) => r.pad_lat !== null && r.pad_lon !== null)
        .map((r) => {
          launchMetaRef.current.set(r.id, r as unknown as Record<string, unknown>);
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [r.pad_lon as number, r.pad_lat as number],
            },
            properties: {
              id: r.id,
              name: r.name,
              upcoming: r.window_start
                ? new Date(r.window_start).getTime() > now
                : false,
            },
          } as GeoJSON.Feature;
        });
      flush(map);
    };

    void loadAircraft();
    void loadVessels();
    void loadSats();
    void loadLaunches();

    const upsertRow = (
      refMap: Map<string, GeoJSON.Feature>,
      makeProps: (r: Record<string, unknown>) => Record<string, unknown>,
      idField: string,
    ) =>
    (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      if (payload.eventType === "DELETE") {
        refMap.delete(String(payload.old[idField]));
        return;
      }
      const r = payload.new;
      if (typeof r.lat !== "number" || typeof r.lon !== "number") return;
      refMap.set(String(r[idField]), {
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lon, r.lat] },
        properties: makeProps(r),
      });
    };

    const channel = supabase
      .channel("live-tracking")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aircraft_positions" },
        upsertRow(
          aircraftRef.current,
          (r) => ({
            id: r.icao24,
            callsign: r.callsign,
            altitude_m: r.altitude_m,
            velocity_ms: r.velocity_ms,
            heading_deg: r.heading_deg,
            on_ground: r.on_ground,
          }),
          "icao24",
        ),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vessel_positions" },
        upsertRow(
          vesselsRef.current,
          (r) => ({
            id: r.mmsi,
            ship_name: r.ship_name,
            speed_kn: r.speed_kn,
            course_deg: r.course_deg,
            heading_deg: r.heading_deg,
          }),
          "mmsi",
        ),
      )
      .subscribe();

    // Throttled flush of realtime updates
    const flushTimer = setInterval(() => flush(map), 2000);

    // Satellite propagation every 2s
    const satTimer = setInterval(() => {
      const src = map.getSource("satellites") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src || satsRef.current.length === 0) return;
      const now = new Date();
      const gmst = sat.gstime(now);
      const features: GeoJSON.Feature[] = [];
      for (const s of satsRef.current) {
        const posVel = sat.propagate(s.rec, now);
        if (!posVel || typeof posVel.position === "boolean") continue;
        const geo = sat.eciToGeodetic(posVel.position, gmst);
        const lat = sat.degreesLat(geo.latitude);
        const lon = sat.degreesLong(geo.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
        const velocity =
          typeof posVel.velocity === "boolean"
            ? null
            : Math.sqrt(
                posVel.velocity.x ** 2 +
                  posVel.velocity.y ** 2 +
                  posVel.velocity.z ** 2,
              );
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [lon, lat] },
          properties: {
            id: s.norad,
            name: s.name,
            altitude_km: geo.height,
            velocity_kms: velocity,
          },
        });
      }
      src.setData({ type: "FeatureCollection", features });
    }, 2000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(flushTimer);
      clearInterval(satTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Header / layer toggles */}
      <div className="absolute left-4 top-4 z-10 rounded-lg border border-border bg-card/90 p-4 shadow-lg backdrop-blur">
        <h1 className="text-sm font-bold tracking-wide text-foreground">
          LIVE TRACKER
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Air · Sea · Space
        </p>
        <div className="mt-3 space-y-1.5">
          {(Object.keys(LAYER_COLORS) as LayerKey[]).map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
            >
              <input
                type="checkbox"
                checked={visible[key]}
                onChange={() =>
                  setVisible((v) => ({ ...v, [key]: !v[key] }))
                }
                className="h-3.5 w-3.5 accent-current"
              />
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: LAYER_COLORS[key] }}
              />
              <span className="capitalize">{key}</span>
              <span className="ml-auto pl-3 tabular-nums text-muted-foreground">
                {counts[key]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selection && (
        <div className="absolute right-4 top-4 z-10 w-72 rounded-lg border border-border bg-card/90 p-4 shadow-lg backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {selection.type}
              </p>
              <h2 className="text-sm font-semibold text-foreground">
                {selection.title}
              </h2>
            </div>
            <button
              onClick={() => setSelection(null)}
              className="rounded px-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>
          <dl className="mt-3 space-y-1.5">
            {selection.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-xs">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
