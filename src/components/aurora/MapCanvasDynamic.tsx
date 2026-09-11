import { useEffect, useState } from "react";
import type { Entity, LayerVisibility } from "./types";

interface MapCanvasDynamicProps {
  entities: Entity[];
  layers: LayerVisibility;
  selectedId?: string | null | undefined;
  onSelect: (entity: Entity) => void;
}

export function MapCanvasDynamic({ entities, layers, selectedId, onSelect }: MapCanvasDynamicProps) {
  const [MapCanvas, setMapCanvas] = useState<React.ComponentType<MapCanvasDynamicProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("./MapCanvas").then((mod) => {
      if (!cancelled) setMapCanvas(() => mod.MapCanvas);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!MapCanvas) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-1 text-console-subtle">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-console-muted border-t-primary" />
          <span className="text-xs tracking-widest uppercase">Initializing map engine…</span>
        </div>
      </div>
    );
  }

  return <MapCanvas entities={entities} layers={layers} selectedId={selectedId} onSelect={onSelect} />;
}
