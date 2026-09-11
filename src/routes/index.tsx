import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { mockDataset, getEntityById, getCounts } from "@/data/mock";
import type { Entity, EntityType } from "@/data/mock";
import {
  TopBar,
  CounterStrip,
  ControlPanel,
  FiltersPanel,
  EntityPanel,
  TimelineFeed,
  AlertsPanel,
  AiInsights,
  MapCanvasDynamic,
} from "@/components/console";
import type { LayerVisibility, Filters, SelectedEntity } from "@/components/console";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OmniSky — Global Air, Sea & Space Intelligence" },
      {
        name: "description",
        content:
          "Live intelligence console tracking aircraft, vessels, satellites, and rocket launches across the globe.",
      },
      {
        property: "og:title",
        content: "OmniSky — Global Air, Sea & Space Intelligence",
      },
      {
        property: "og:description",
        content:
          "Live intelligence console tracking aircraft, vessels, satellites, and rocket launches across the globe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [layers, setLayers] = useState<LayerVisibility>({
    aircraft: true,
    ship: true,
    satellite: true,
    launch: true,
  });

  const [filters, setFilters] = useState<Filters>({
    search: "",
    riskRange: [0, 100],
    affiliations: [],
    classifications: [],
  });

  const [selected, setSelected] = useState<SelectedEntity>(null);

  const allEntities = useMemo<Entity[]>(
    () => [...mockDataset.aircraft, ...mockDataset.ships, ...mockDataset.satellites, ...mockDataset.launches],
    []
  );

  const filteredEntities = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return allEntities.filter((e) => {
      if (!layers[e.type]) return false;
      if (e.riskScore < filters.riskRange[0] || e.riskScore > filters.riskRange[1]) return false;
      if (filters.affiliations.length > 0 && !("affiliation" in e && filters.affiliations.includes(e.affiliation))) return false;
      if (filters.classifications.length > 0 && !filters.classifications.includes(e.classification)) return false;
      if (search) {
        const hay = `${e.name} ${e.id} ${e.type} ${"callsign" in e ? e.callsign : ""} ${"mmsi" in e ? e.mmsi : ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [allEntities, layers, filters]);

  const counts = useMemo(() => getCounts(), []);

  const handleSelectEntity = useCallback((entity: Entity) => {
    setSelected({ entity, source: "map" });
  }, []);

  const handleSelectById = useCallback((id: string, type?: EntityType) => {
    const entity = getEntityById(id, type);
    if (entity) setSelected({ entity, source: "list" });
  }, []);

  const handleSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const toggleLayer = useCallback((key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleRefresh = useCallback(() => {
    // Placeholder refresh; live data will replace mock dataset later.
    window.location.reload();
  }, []);

  return (
    <ClientOnly
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-console-bg text-console-muted">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono uppercase tracking-wider">Loading OmniSky console…</span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-console-bg text-console-text">
        <TopBar onSearch={handleSearch} />
        <CounterStrip counts={counts} />
        <div className="flex flex-1 min-h-0">
          <ControlPanel layers={layers} onToggleLayer={toggleLayer} onRefresh={handleRefresh} />
          <div className="hidden lg:flex shrink-0">
            <FiltersPanel filters={filters} onChange={setFilters} />
          </div>
          <div className="flex-1 min-w-[360px] relative">
            <MapCanvasDynamic
              entities={filteredEntities}
              layers={layers}
              selectedId={selected?.entity.id ?? null}
              onSelect={handleSelectEntity}
            />
          </div>
          <div className="hidden 2xl:flex shrink-0">
            <EntityPanel
              selected={selected}
              onClose={() => setSelected(null)}
              onSelectNearby={handleSelectEntity}
            />
          </div>
          <div className="hidden xl:flex w-72 shrink-0 flex-col border-l border-console-border">
            <div className="flex-1 min-h-0">
              <AlertsPanel alerts={mockDataset.alerts} onSelect={(id) => handleSelectById(id)} />
            </div>
            <div className="flex-1 min-h-0 border-t border-console-border">
              <AiInsights insights={mockDataset.insights} />
            </div>
          </div>
          <div className="hidden xl:block w-80 shrink-0">
            <TimelineFeed events={mockDataset.events} onSelect={handleSelectById} />
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
