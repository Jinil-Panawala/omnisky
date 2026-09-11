import { useEffect, useRef, useState } from "react";
import { Map, NavigationControl, AttributionControl, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Entity, EntityType, LayerVisibility } from "./types";

interface MapCanvasProps {
  entities: Entity[];
  layers: LayerVisibility;
  selectedId?: string | null;
  onSelect: (entity: Entity) => void;
}

const entityColors: Record<EntityType, string> = {
  aircraft: "#3b82f6",
  ship: "#06b6d4",
  satellite: "#eab308",
  launch: "#ef4444",
  alert: "#f97316",
};

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: {
      id: string;
      type: EntityType;
      name: string;
      riskScore: number;
    };
  }>;
};

export function MapCanvas({ entities, layers, selectedId, onSelect }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new Map({
      container: mapContainer.current,
      style: {
        version: 8,
        projection: { type: "globe" },
        sky: {
          "sky-color": "#050a18",
          "sky-horizon-blend": 0.5,
          "horizon-color": "#0b1a35",
          "horizon-fog-blend": 0.6,
          "fog-color": "#0b1020",
          "fog-ground-blend": 0.1,
        },
        light: { anchor: "map", intensity: 0.2 },
        sources: {
          nightlights: {
            type: "raster",
            tiles: [
              "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
            ],
            tileSize: 256,
            maxzoom: 8,
            attribution: "NASA EOSDIS GIBS",
          },
          labels: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors, &copy; CARTO",
          },
        },
        layers: [
          {
            id: "space",
            type: "background",
            paint: { "background-color": "#04070f" },
          },
          {
            id: "nightlights-layer",
            type: "raster",
            source: "nightlights",
            paint: {
              "raster-opacity": 1,
              "raster-contrast": 0.2,
              "raster-saturation": -0.15,
            },
          },
          {
            id: "labels-layer",
            type: "raster",
            source: "labels",
            minzoom: 3,
            paint: {
              "raster-opacity": 0.35,
              "raster-saturation": -0.8,
            },
          },
        ],
      },
      center: [20, 25],
      zoom: 1.6,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      setLoaded(true);
    });

    mapRef.current = map;
    (window as unknown as Record<string, unknown>)["__auroraMap"] = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    const visible = entities.filter((e) => layers[e.type]);
    const geojson: GeoJSONFeatureCollection = {
      type: "FeatureCollection",
      features: visible.map((e) => ({
        type: "Feature",
        geometry: {
          type: "Point",
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

    const source = map.getSource("entities") as GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson as any);
    } else {
      map.addSource("entities", {
        type: "geojson",
        data: geojson as any,
      });

      map.addLayer({
        id: "entity-glow",
        type: "circle",
        source: "entities",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1,
            10,
            10,
            24,
          ],
          "circle-color": ["match", ["get", "type"], "aircraft", entityColors.aircraft, "ship", entityColors.ship, "satellite", entityColors.satellite, entityColors.launch],
          "circle-opacity": 0.25,
          "circle-blur": 0.8,
        },
      });

      map.addLayer({
        id: "entity-dot",
        type: "circle",
        source: "entities",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1,
            4.5,
            10,
            9,
          ],
          "circle-color": ["match", ["get", "type"], "aircraft", entityColors.aircraft, "ship", entityColors.ship, "satellite", entityColors.satellite, entityColors.launch],
          "circle-stroke-color": "#0b1020",
          "circle-stroke-width": 1.5,
        },
      });

      map.on("click", "entity-dot", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as Record<string, unknown> | undefined;
        const id = typeof props?.["id"] === "string" ? props["id"] : "";
        const entity = entities.find((en) => en.id === id);
        if (entity) onSelect(entity);
      });

      map.on("mouseenter", "entity-dot", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "entity-dot", () => {
        map.getCanvas().style.cursor = "";
      });
    }
  }, [entities, layers, loaded, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const source = map.getSource("entities") as GeoJSONSource | undefined;
    if (!source) return;
    const visible = entities.filter((e) => layers[e.type]);
    source.setData({
      type: "FeatureCollection",
      features: visible.map((e) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [e.lon, e.lat],
        },
        properties: {
          id: e.id,
          type: e.type,
          name: e.name,
          riskScore: "riskScore" in e ? e.riskScore : 0,
        },
      })),
    } as any);
  }, [entities, layers, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const source = map.getSource("entities") as GeoJSONSource | undefined;
    if (!source) return;
    const data = source.serialize?.().data as GeoJSONFeatureCollection | undefined;
    if (!data) return;
    const features = data.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        selected: f.properties.id === selectedId,
      },
    }));
    source.setData({ type: "FeatureCollection", features } as any);
  }, [selectedId, loaded]);

  return (
    <div className="relative w-full h-full bg-surface-1">
      <div ref={mapContainer} className="h-full w-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-1 text-console-subtle">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-console-muted border-t-primary" />
            <span className="text-xs tracking-widest uppercase">Loading map tiles…</span>
          </div>
        </div>
      )}
    </div>
  );
}
