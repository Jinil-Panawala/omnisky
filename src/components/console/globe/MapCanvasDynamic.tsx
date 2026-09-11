import { useEffect, useState } from "react";
import type { Entity, LayerVisibility } from "./types";

interface MapCanvasDynamicProps {
  entities: Entity[];
  layers: LayerVisibility;
  selectedId?: string | null | undefined;
  onSelect: (entity: Entity) => void;
}

export function MapCanvasDynamic({ entities, layers, selectedId, onSelect }: MapCanvasDynamicProps) {
  const [Globe, setGlobe] = useState<React.ComponentType<MapCanvasDynamicProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";
    import("./CesiumGlobe").then((mod) => {
      if (!cancelled) setGlobe(() => mod.CesiumGlobe as React.ComponentType<MapCanvasDynamicProps>);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Globe) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-1 text-console-subtle">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-console-muted border-t-primary" />
          <span className="text-xs tracking-widest uppercase">Initializing globe engine…</span>
        </div>
      </div>
    );
  }

  return <Globe entities={entities} layers={layers} selectedId={selectedId} onSelect={onSelect} />;
}
