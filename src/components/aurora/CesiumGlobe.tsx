import { useEffect, useRef, useState } from "react";
import {
  Viewer,
  UrlTemplateImageryProvider,
  ImageryLayer,
  Cartesian3,
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  NearFarScalar,
  Math as CesiumMath,
  Entity as CesiumEntity,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Entity, EntityType, LayerVisibility } from "./types";

interface CesiumGlobeProps {
  entities: Entity[];
  layers: LayerVisibility;
  selectedId?: string | null | undefined;
  onSelect: (entity: Entity) => void;
}

const entityColors: Record<EntityType, string> = {
  aircraft: "#3b82f6",
  ship: "#06b6d4",
  satellite: "#eab308",
  launch: "#ef4444",
  alert: "#f97316",
};

const NIGHT_LIGHTS =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg";
const DARK_LABELS = "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";

export function CesiumGlobe({ entities, layers, selectedId, onSelect }: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const entitiesRef = useRef<Entity[]>(entities);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);

  entitiesRef.current = entities;
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Viewer(containerRef.current, {
      baseLayer: ImageryLayer.fromProviderAsync(
        Promise.resolve(
          new UrlTemplateImageryProvider({
            url: NIGHT_LIGHTS,
            maximumLevel: 8,
            credit: "NASA EOSDIS GIBS",
          })
        ),
        {}
      ),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: true,
    });

    const labels = viewer.imageryLayers.addImageryProvider(
      new UrlTemplateImageryProvider({
        url: DARK_LABELS,
        maximumLevel: 12,
        credit: "© OpenStreetMap contributors, © CARTO",
      })
    );
    labels.alpha = 0.35;
    labels.saturation = 0.2;

    const scene = viewer.scene;
    scene.backgroundColor = Color.fromCssColorString("#04070f");
    scene.globe.baseColor = Color.fromCssColorString("#04070f");
    scene.globe.showGroundAtmosphere = true;
    scene.globe.enableLighting = false;
    if (scene.skyAtmosphere) {
      scene.skyAtmosphere.hueShift = -0.05;
      scene.skyAtmosphere.saturationShift = -0.1;
      scene.skyAtmosphere.brightnessShift = -0.35;
    }
    scene.fog.enabled = false;
    scene.highDynamicRange = false;
    viewer.cesiumWidget.creditContainer.setAttribute("style", "display:none");

    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(24, 20, 24_000_000),
    });
    scene.screenSpaceCameraController.minimumZoomDistance = 800_000;
    scene.screenSpaceCameraController.maximumZoomDistance = 45_000_000;

    const handler = new ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = scene.pick(movement.position);
      const id = picked?.id;
      if (id instanceof CesiumEntity && typeof id.id === "string") {
        const found = entitiesRef.current.find((e) => e.id === id.id);
        if (found) onSelectRef.current(found);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    viewerRef.current = viewer;
    setReady(true);

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Sync entities
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;

    const visible = entities.filter((e) => layers[e.type]);
    viewer.entities.suspendEvents();
    viewer.entities.removeAll();

    for (const e of visible) {
      const color = Color.fromCssColorString(entityColors[e.type]);
      const isSelected = e.id === selectedId;
      const heightM = e.type === "satellite" ? 550_000 : e.type === "aircraft" ? 10_000 : 0;
      viewer.entities.add({
        id: e.id,
        name: e.name,
        position: Cartesian3.fromDegrees(e.lon, e.lat, heightM),
        point: {
          pixelSize: isSelected ? 13 : 7,
          color,
          outlineColor: isSelected
            ? Color.fromCssColorString("#e2e8f0")
            : color.withAlpha(0.35),
          outlineWidth: isSelected ? 3 : 6,
          scaleByDistance: new NearFarScalar(1_000_000, 1.6, 30_000_000, 0.7),
        },
      });
    }

    viewer.entities.resumeEvents();
  }, [entities, layers, selectedId, ready]);

  // Fly to selection
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready || !selectedId) return;
    const target = entities.find((e) => e.id === selectedId);
    if (!target) return;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(target.lon, target.lat, 9_000_000),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
      duration: 1.2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  return (
    <div className="relative h-full w-full bg-surface-1">
      <div ref={containerRef} className="aurora-cesium h-full w-full" />
      <div className="pointer-events-none absolute inset-0 aurora-globe-vignette" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-1 text-console-subtle">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-console-muted border-t-primary" />
            <span className="text-xs uppercase tracking-widest">Initializing globe…</span>
          </div>
        </div>
      )}
    </div>
  );
}
