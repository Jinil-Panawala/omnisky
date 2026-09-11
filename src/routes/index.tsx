import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClientOnly } from "@/components/ClientOnly";
import { mockDataset } from "@/data/mock";
import type { Entity } from "@/data/mock";
import { useLiveEntities } from "@/hooks/useLiveEntities";
import { SOURCE_ATTRIBUTION } from "@/lib/entities/canonical";
import { lodForHeight } from "@/lib/geo/spatial";
import { getObjectTrack } from "@/lib/live.functions";
import { generateStressDataset } from "@/lib/dev/synthetic";
import type { GlobeViewState } from "@/components/console/globe/MapCanvasDynamic";
import type { DataMode } from "@/components/console/layout/TopBar";
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
  PanelToggles,
} from "@/components/console";
import type { PanelVisibility } from "@/components/console";
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
  const [mode, setMode] = useState<DataMode>("demo");
  const [view, setView] = useState<GlobeViewState>({ bounds: null, heightM: 24_000_000 });

  // Side panels can be hidden to give the map the full width.
  const [panels, setPanels] = useState<PanelVisibility>({
    filters: true,
    alerts: true,
    feed: true,
    details: true,
  });
  const togglePanel = useCallback((key: keyof PanelVisibility) => {
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);


  // Dev/QA flags: ?stress=1 loads a synthetic 45k-object dataset, ?stats=1 shows metrics.
  const [flags, setFlags] = useState<{ stress: boolean; stats: boolean; counts: number[] }>({
    stress: false,
    stats: false,
    counts: [20000, 20000, 5000],
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const num = (k: string, d: number) => Number(params.get(k) ?? d) || d;
    setFlags({
      stress: params.get("stress") === "1",
      stats: params.get("stats") === "1" || params.get("stress") === "1" || import.meta.env.DEV,
      counts: [num("aircraft", 20000), num("ships", 20000), num("sats", 5000)],
    });
  }, []);

  // Ask the backend only for what the current camera can see, with a density
  // budget derived from the zoom level.
  const viewport = useMemo(
    () => ({ bounds: view.bounds, limit: Math.min(8000, lodForHeight(view.heightM).maxIndividual * 3) }),
    [view]
  );

  const live = useLiveEntities(mode === "live" && !flags.stress, viewport);

  const stressEntities = useMemo<Entity[]>(
    () =>
      flags.stress
        ? generateStressDataset({
            aircraft: flags.counts[0]!,
            ships: flags.counts[1]!,
            satellites: flags.counts[2]!,
          })
        : [],
    [flags]
  );

  const allEntities = useMemo<Entity[]>(
    () =>
      flags.stress
        ? [...stressEntities, ...mockDataset.launches]
        : mode === "live"
        ? live.entities
        : [
            ...mockDataset.aircraft,
            ...mockDataset.ships,
            ...mockDataset.satellites,
            ...mockDataset.launches,
          ],
    [mode, live.entities, flags.stress, stressEntities]
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

  const counts = useMemo(() => {
    const tally = { aircraft: 0, ships: 0, satellites: 0, launches: 0 };
    for (const e of allEntities) {
      if (e.type === "aircraft") tally.aircraft += 1;
      else if (e.type === "ship") tally.ships += 1;
      else if (e.type === "satellite") tally.satellites += 1;
      else if (e.type === "launch") tally.launches += 1;
    }
    return { ...tally, alerts: mockDataset.alerts.length };
  }, [allEntities]);

  // Filter choices come from the data actually in play, with live counts.
  const facets = useMemo(() => {
    const aff = new Map<string, number>();
    const cls = new Map<string, number>();
    for (const e of allEntities) {
      if (!layers[e.type]) continue;
      if ("affiliation" in e && e.affiliation) aff.set(e.affiliation, (aff.get(e.affiliation) ?? 0) + 1);
      if (e.classification) cls.set(e.classification, (cls.get(e.classification) ?? 0) + 1);
    }
    const top = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 20)
        .map(([value, count]) => ({ value, count }));
    return { affiliations: top(aff), classifications: top(cls) };
  }, [allEntities, layers]);


  const fetchTrack = useServerFn(getObjectTrack);
  const selectedEntity = selected?.entity;
  const trackable =
    mode === "live" && !flags.stress && selectedEntity
      ? selectedEntity.type === "aircraft"
        ? { craftType: "aircraft" as const, craftId: selectedEntity.icao24 }
        : selectedEntity.type === "ship"
          ? { craftType: "ship" as const, craftId: selectedEntity.mmsi }
          : null
      : null;

  const trackQuery = useQuery({
    queryKey: ["object-track", trackable?.craftType, trackable?.craftId],
    queryFn: () => fetchTrack({ data: trackable! }),
    enabled: !!trackable,
    staleTime: 30000,
  });

  const handleSelectEntity = useCallback((entity: Entity) => {
    setSelected({ entity, source: "map" });
  }, []);

  const handleSelectById = useCallback(
    (id: string) => {
      const entity = allEntities.find((e) => e.id === id);
      if (entity) setSelected({ entity, source: "list" });
    },
    [allEntities]
  );


  const handleSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const toggleLayer = useCallback((key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleRefresh = useCallback(() => {
    if (mode === "live") live.refresh();
    else window.location.reload();
  }, [mode, live]);

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
        <TopBar
          onSearch={handleSearch}
          mode={mode}
          onModeChange={setMode}
          feedStatus={live.status}
          lastUpdated={live.lastUpdated}
        />
        <div className="flex items-center border-b border-console-border bg-console-bg">
          <div className="flex-1 min-w-0">
            <CounterStrip counts={counts} />
          </div>
          <PanelToggles panels={panels} onToggle={togglePanel} />
        </div>
        <div className="flex flex-1 min-h-0">
          <ControlPanel layers={layers} onToggleLayer={toggleLayer} onRefresh={handleRefresh} />
          {panels.filters && (
            <div className="hidden lg:flex shrink-0">
              <FiltersPanel filters={filters} onChange={setFilters} />
            </div>
          )}
          <div className="flex-1 min-w-[360px] relative">
            <MapCanvasDynamic
              entities={filteredEntities}
              layers={layers}
              selectedId={selected?.entity.id ?? null}
              onSelect={handleSelectEntity}
              onViewChange={setView}
              track={trackQuery.data?.map((p) => ({ lat: p.lat, lon: p.lon }))}
              showStats={flags.stats}
              dataLoading={mode === "live" && live.fetching}
            />
          </div>
          {panels.details && (
            <div className="hidden 2xl:flex shrink-0">
              <EntityPanel
                selected={selected}
                onClose={() => setSelected(null)}
                onSelectNearby={handleSelectEntity}
                entities={allEntities}
              />
            </div>
          )}
          {panels.alerts && (
            <div className="hidden xl:flex w-72 shrink-0 flex-col border-l border-console-border">
              <div className="flex-1 min-h-0">
                <AlertsPanel alerts={mockDataset.alerts} onSelect={(id) => handleSelectById(id)} />
              </div>
              <div className="flex-1 min-h-0 border-t border-console-border">
                <AiInsights insights={mockDataset.insights} />
              </div>
            </div>
          )}
          {panels.feed && (
            <div className="hidden xl:block w-80 shrink-0">
              <TimelineFeed
                events={mode === "live" ? live.events : mockDataset.events}
                onSelect={handleSelectById}
              />
            </div>
          )}
        </div>
        <footer className="h-6 shrink-0 flex items-center gap-3 px-4 border-t border-console-border bg-console-panel overflow-x-auto">
          <span className="text-[10px] font-mono uppercase tracking-wider text-console-dim shrink-0">
            {mode === "live" ? "Live public data" : "Demo data"}
          </span>
          {SOURCE_ATTRIBUTION.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[10px] font-mono text-console-dim hover:text-console-text whitespace-nowrap"
            >
              {s.scope}: {s.label}
            </a>
          ))}
          <span className="text-[10px] font-mono text-console-dim whitespace-nowrap">
            Coverage is partial and positions are not authoritative.
          </span>
        </footer>
      </div>
    </ClientOnly>
  );
}
