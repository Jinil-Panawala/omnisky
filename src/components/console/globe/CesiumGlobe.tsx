import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Viewer,
  UrlTemplateImageryProvider,
  ImageryLayer,
  BillboardCollection,
  LabelCollection,
  PolylineCollection,
  Material,
  Cartesian2,
  Cartesian3,
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  NearFarScalar,
  DistanceDisplayCondition,
  HorizontalOrigin,
  VerticalOrigin,
  LabelStyle,
  Math as CesiumMath,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Entity, EntityType, LayerVisibility } from "@/domain/console";
import { clusterIconUrl, entityIconUrl } from "./entity-icons";
import {
  buildRenderSet,
  lodForHeight,
  padBounds,
  shouldLabel,
  type CameraView,
  type RenderStats,
  type ViewportBounds,
} from "@/lib/geo/spatial";
import { MotionStore, type MotionInput } from "@/lib/geo/motion";

export interface GlobeViewState extends CameraView {}

interface CesiumGlobeProps {
  entities: Entity[];
  layers: LayerVisibility;
  selectedId?: string | null | undefined;
  onSelect: (entity: Entity) => void;
  onViewChange?: ((view: GlobeViewState) => void) | undefined;
  track?: Array<{ lat: number; lon: number }> | undefined;
  showStats?: boolean | undefined;
  dataLoading?: boolean | undefined;
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
const DARK_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
const STREET_MAP = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

type BaseMapMode = "lights" | "map";

type PickPayload =
  | { kind: "entity"; id: string }
  | { kind: "cluster"; lat: number; lon: number; count: number };

export function CesiumGlobe({
  entities,
  layers,
  selectedId,
  onSelect,
  onViewChange,
  track,
  showStats,
  dataLoading,
}: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const billboardsRef = useRef<BillboardCollection | null>(null);
  const clusterBillboardsRef = useRef<BillboardCollection | null>(null);
  const labelsRef = useRef<LabelCollection | null>(null);
  const trackRef = useRef<PolylineCollection | null>(null);
  const entitiesRef = useRef<Entity[]>(entities);
  const onSelectRef = useRef(onSelect);
  const onViewChangeRef = useRef(onViewChange);
  const labelsLayerRef = useRef<ImageryLayer | null>(null);
  const streetLayerRef = useRef<ImageryLayer | null>(null);
  // Smoothed movement: display positions eased/dead-reckoned between fixes.
  const motionRef = useRef(new MotionStore());
  const animatedRef = useRef<
    Array<{
      id: string;
      heightM: number;
      billboard: { position: Cartesian3 };
      label?: { position: Cartesian3 } | undefined;
    }>
  >([]);

  const [ready, setReady] = useState(false);
  const [baseMap, setBaseMap] = useState<BaseMapMode>("lights");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState<GlobeViewState>({ bounds: null, heightM: 24_000_000 });
  const [perfScale, setPerfScale] = useState(1);
  const [fps, setFps] = useState(60);
  const [stats, setStats] = useState<RenderStats>({
    visible: 0,
    rendered: 0,
    clusters: 0,
    clustered: 0,
    computeMs: 0,
  });

  entitiesRef.current = entities;
  onSelectRef.current = onSelect;
  onViewChangeRef.current = onViewChange;

  useEffect(() => {
    if (!ready) return;
    if (labelsLayerRef.current) labelsLayerRef.current.show = true;
    if (streetLayerRef.current) streetLayerRef.current.show = baseMap === "map";
  }, [baseMap, ready]);

  const readCameraView = useCallback((viewer: Viewer): GlobeViewState => {
    const rect = viewer.camera.computeViewRectangle();
    const heightM = viewer.camera.positionCartographic.height;
    if (!rect) return { bounds: null, heightM };
    const bounds: ViewportBounds = {
      west: CesiumMath.toDegrees(rect.west),
      east: CesiumMath.toDegrees(rect.east),
      south: CesiumMath.toDegrees(rect.south),
      north: CesiumMath.toDegrees(rect.north),
    };
    const width = bounds.west <= bounds.east ? bounds.east - bounds.west : 360 - bounds.west + bounds.east;
    if (width >= 350 && bounds.north - bounds.south >= 170) return { bounds: null, heightM };
    return { bounds: padBounds(bounds), heightM };
  }, []);

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
      requestRenderMode: false,
    });

    const street = viewer.imageryLayers.addImageryProvider(
      new UrlTemplateImageryProvider({
        url: STREET_MAP,
        maximumLevel: 18,
        credit: "© OpenStreetMap contributors",
      })
    );
    street.show = false;
    street.brightness = 0.4;
    street.contrast = 1.05;
    street.saturation = 0.25;
    streetLayerRef.current = street;

    const mapLabels = viewer.imageryLayers.addImageryProvider(
      new UrlTemplateImageryProvider({
        url: DARK_LABELS,
        maximumLevel: 16,
        credit: "Esri",
      })
    );
    mapLabels.alpha = 0.95;
    mapLabels.brightness = 1.6;
    labelsLayerRef.current = mapLabels;

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
    scene.screenSpaceCameraController.minimumZoomDistance = 800;
    scene.screenSpaceCameraController.maximumZoomDistance = 45_000_000;

    // WebGL primitive collections — no per-object Cesium Entity, no DOM markers.
    const billboards = scene.primitives.add(new BillboardCollection({ scene })) as BillboardCollection;
    const clusterBillboards = scene.primitives.add(
      new BillboardCollection({ scene })
    ) as BillboardCollection;
    const labelCollection = scene.primitives.add(new LabelCollection({ scene })) as LabelCollection;
    const polylines = scene.primitives.add(new PolylineCollection()) as PolylineCollection;
    billboardsRef.current = billboards;
    clusterBillboardsRef.current = clusterBillboards;
    labelsRef.current = labelCollection;
    trackRef.current = polylines;

    const handler = new ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction((movement: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = scene.pick(movement.position);
      const payload = picked?.id as PickPayload | undefined;
      if (!payload) return;
      if (payload.kind === "entity") {
        const found = entitiesRef.current.find((e) => e.id === payload.id);
        if (found) onSelectRef.current(found);
      } else {
        // Zoom into the cluster instead of selecting it.
        const height = Math.max(120_000, viewer.camera.positionCartographic.height / 3.2);
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(payload.lon, payload.lat, height),
          duration: 1,
        });
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    let hoverTimer: ReturnType<typeof setTimeout> | undefined;
    handler.setInputAction((movement: ScreenSpaceEventHandler.MotionEvent) => {
      if (hoverTimer) return;
      hoverTimer = setTimeout(() => {
        hoverTimer = undefined;
        const picked = scene.pick(movement.endPosition);
        const payload = picked?.id as PickPayload | undefined;
        setHoveredId(payload && payload.kind === "entity" ? payload.id : null);
      }, 90);
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Throttled camera -> viewport updates (never per frame).
    let cameraTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleViewUpdate = () => {
      if (cameraTimer) clearTimeout(cameraTimer);
      cameraTimer = setTimeout(() => {
        const next = readCameraView(viewer);
        setView(next);
        onViewChangeRef.current?.(next);
      }, 160);
    };
    viewer.camera.percentageChanged = 0.12;
    viewer.camera.changed.addEventListener(scheduleViewUpdate);
    viewer.camera.moveEnd.addEventListener(scheduleViewUpdate);

    // Lightweight FPS sampling drives graceful degradation.
    let frames = 0;
    let last = performance.now();
    const onPostRender = () => {
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        const measured = (frames * 1000) / (now - last);
        frames = 0;
        last = now;
        setFps(Math.round(measured));
        setPerfScale((prev) => {
          const target = measured < 25 ? 0.45 : measured < 40 ? 0.7 : 1;
          return Math.abs(prev - target) < 0.05 ? prev : target;
        });
      }
    };
    scene.postRender.addEventListener(onPostRender);

    // Smooth movement: ease + dead-reckon rendered objects every frame instead
    // of teleporting them when a new fix arrives.
    let lastMotion = 0;
    const onPreRender = () => {
      const now = performance.now();
      if (now - lastMotion < 33) return;
      lastMotion = now;
      const motion = motionRef.current;
      motion.tick(now);
      for (const item of animatedRef.current) {
        const pos = motion.sample(item.id);
        if (!pos) continue;
        const cart = Cartesian3.fromDegrees(pos.lon, pos.lat, item.heightM);
        item.billboard.position = cart;
        if (item.label) item.label.position = cart;
      }
    };
    scene.preRender.addEventListener(onPreRender);

    viewerRef.current = viewer;
    setReady(true);
    const initial = readCameraView(viewer);
    setView(initial);
    onViewChangeRef.current?.(initial);

    return () => {
      if (cameraTimer) clearTimeout(cameraTimer);
      if (hoverTimer) clearTimeout(hoverTimer);
      scene.postRender.removeEventListener(onPostRender);
      scene.preRender.removeEventListener(onPreRender);
      animatedRef.current = [];
      motionRef.current.clear();
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      billboardsRef.current = null;
      clusterBillboardsRef.current = null;
      labelsRef.current = null;
      trackRef.current = null;
    };
  }, [readCameraView]);

  // Filter before rendering, then cluster / budget for the current camera.
  const renderSet = useMemo(() => {
    const pool = entities.filter((e) => layers[e.type as keyof LayerVisibility] !== false);
    return buildRenderSet(pool, {
      view,
      selectedId: selectedId ?? null,
      hoveredId,
      perfScale,
    });
  }, [entities, layers, view, selectedId, hoveredId, perfScale]);

  useEffect(() => setStats(renderSet.stats), [renderSet]);

  // Feed the latest fixes into the motion store (targets, not drawn positions).
  useEffect(() => {
    const inputs: MotionInput[] = entities.map((e) => {
      if (e.type === "aircraft") {
        return {
          id: e.id,
          lat: e.lat,
          lon: e.lon,
          headingDeg: e.headingDeg ?? null,
          speedMs: e.velocityMs ?? null,
        };
      }
      if (e.type === "ship") {
        return {
          id: e.id,
          lat: e.lat,
          lon: e.lon,
          headingDeg: e.courseDeg ?? e.headingDeg ?? null,
          speedMs: e.speedKn != null ? e.speedKn * 0.514444 : null,
        };
      }
      // Satellites are propagated upstream; launches don't move.
      return { id: e.id, lat: e.lat, lon: e.lon, extrapolate: false };
    });
    motionRef.current.sync(inputs);
  }, [entities]);

  // Push the render set into the WebGL collections.
  useEffect(() => {
    const billboards = billboardsRef.current;
    const clusters = clusterBillboardsRef.current;
    const labelCollection = labelsRef.current;
    if (!ready || !billboards || !clusters || !labelCollection) return;

    const lod = lodForHeight(view.heightM, perfScale);
    billboards.removeAll();
    clusters.removeAll();
    labelCollection.removeAll();
    const animated: typeof animatedRef.current = [];

    for (const point of renderSet.points) {
      const e = point.entity;
      const isSelected = e.id === selectedId;
      const heightM = e.type === "satellite" ? 550_000 : e.type === "aircraft" ? 10_000 : 0;
      const size = isSelected ? 44 : point.priority >= 2 ? 36 : 30;
      const smoothed = motionRef.current.sample(e.id);
      const position = Cartesian3.fromDegrees(
        smoothed?.lon ?? e.lon,
        smoothed?.lat ?? e.lat,
        heightM,
      );
      const billboard = billboards.add({
        position,
        image: entityIconUrl(e.type, entityColors[e.type], isSelected),
        width: size,
        height: size,
        scaleByDistance: new NearFarScalar(1_000_000, 1.25, 30_000_000, 0.7),
        id: { kind: "entity", id: e.id } satisfies PickPayload,
      });

      let label: { position: Cartesian3 } | undefined;
      if (shouldLabel(point, lod, selectedId, hoveredId)) {
        label = labelCollection.add({
          position,
          text: e.name,
          font: "500 11px ui-monospace, SFMono-Regular, monospace",
          fillColor: Color.fromCssColorString(isSelected ? "#e2e8f0" : entityColors[e.type]),
          outlineColor: Color.fromCssColorString("#04070f"),
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, 18),
          horizontalOrigin: HorizontalOrigin.CENTER,
          verticalOrigin: VerticalOrigin.TOP,
          distanceDisplayCondition: new DistanceDisplayCondition(0, 40_000_000),
        });
      }

      if (e.type !== "launch") {
        animated.push({ id: e.id, heightM, billboard, label });
      }
    }

    animatedRef.current = animated;

    for (const cluster of renderSet.clusters) {
      const bucket = cluster.count >= 500 ? 2 : cluster.count >= 50 ? 1 : 0;
      const color = entityColors[cluster.type];
      const px = [34, 42, 50][bucket]!;
      // Nudge per type so co-located aircraft/ship/satellite clusters stay readable.
      const nudge =
        cluster.type === "aircraft"
          ? new Cartesian2(-px * 0.55, -px * 0.2)
          : cluster.type === "ship"
            ? new Cartesian2(px * 0.55, -px * 0.2)
            : new Cartesian2(0, px * 0.5);
      clusters.add({
        pixelOffset: nudge,
        position: Cartesian3.fromDegrees(cluster.longitude, cluster.latitude, 0),
        image: clusterIconUrl(cluster.type, color, bucket as 0 | 1 | 2),
        width: px,
        height: px,
        id: {
          kind: "cluster",
          lat: cluster.latitude,
          lon: cluster.longitude,
          count: cluster.count,
        } satisfies PickPayload,
      });
      labelCollection.add({
        position: Cartesian3.fromDegrees(cluster.longitude, cluster.latitude, 0),
        text: cluster.count >= 1000 ? `${(cluster.count / 1000).toFixed(1)}k` : String(cluster.count),
        font: "600 11px ui-monospace, SFMono-Regular, monospace",
        fillColor: Color.fromCssColorString("#e2e8f0"),
        outlineColor: Color.fromCssColorString("#04070f"),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian2(nudge.x, nudge.y + px * 0.55),
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.TOP,
      });
    }
  }, [renderSet, ready, selectedId, hoveredId, view.heightM, perfScale]);

  // Track for the selected object only.
  useEffect(() => {
    const polylines = trackRef.current;
    if (!ready || !polylines) return;
    polylines.removeAll();
    if (!track || track.length < 2) return;
    polylines.add({
      positions: track.map((p) => Cartesian3.fromDegrees(p.lon, p.lat, 0)),
      width: 2,
      material: Material.fromType("Color", {
        color: Color.fromCssColorString("#38bdf8").withAlpha(0.8),
      }),
    });
  }, [track, ready]);

  // Fly to selection
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready || !selectedId) return;
    const target = entitiesRef.current.find((e) => e.id === selectedId);
    if (!target) return;
    const height = target.type === "satellite" ? 3_500_000 : 600_000;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(target.lon, target.lat, height),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
      duration: 1.4,
    });
  }, [selectedId, ready]);

  return (
    <div className="relative h-full w-full bg-surface-1">
      <div ref={containerRef} className="globe-cesium h-full w-full" />
      <div className="pointer-events-none absolute inset-0 globe-vignette" />
      <div className="absolute right-3 top-3 flex overflow-hidden rounded-md border border-console-border bg-surface-1/85 backdrop-blur">
        {(
          [
            { key: "lights", label: "City Lights" },
            { key: "map", label: "Map" },
          ] as Array<{ key: BaseMapMode; label: string }>
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setBaseMap(opt.key)}
            className={`px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors ${
              baseMap === opt.key
                ? "bg-primary/20 text-primary"
                : "text-console-subtle hover:text-console-text"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {dataLoading && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-console-border bg-surface-1/80 px-2 py-1 backdrop-blur">
          <div className="h-2.5 w-2.5 animate-spin rounded-full border border-console-muted border-t-primary" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-console-subtle">
            Updating
          </span>
        </div>
      )}

      {showStats && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-console-border bg-surface-1/85 px-3 py-2 font-mono text-[10px] leading-4 text-console-subtle backdrop-blur">
          <div>Visible objects: {stats.visible.toLocaleString()}</div>
          <div>Rendered objects: {stats.rendered.toLocaleString()}</div>
          <div>Clusters: {stats.clusters.toLocaleString()} ({stats.clustered.toLocaleString()} grouped)</div>
          <div>FPS: {fps}</div>
          <div>Data update: {stats.computeMs}ms</div>
          <div>Altitude: {Math.round(view.heightM / 1000).toLocaleString()} km · LOD {lodForHeight(view.heightM, perfScale).cellDeg}°</div>
        </div>
      )}

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
