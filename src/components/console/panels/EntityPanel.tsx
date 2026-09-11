import { X, Plane, Ship, Satellite, Rocket, AlertTriangle, Navigation, Activity, Wind, Gauge, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockDataset, getNearbyEntities } from "@/data/mock";
import type { Entity, SelectedEntity } from "../types";

interface EntityPanelProps {
  selected: SelectedEntity;
  onClose: () => void;
  onSelectNearby: (entity: Entity) => void;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function RiskBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-console-bg overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-alert"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-console-text">{score}</span>
    </div>
  );
}

export function EntityPanel({ selected, onClose, onSelectNearby }: EntityPanelProps) {
  if (!selected) {
    return (
      <div className="w-80 flex flex-col items-center justify-center gap-3 p-6 bg-console-panel border-l border-console-border text-center">
        <Target className="w-10 h-10 text-console-dim" />
        <p className="text-sm text-console-muted">Select an entity on the map or timeline to view details.</p>
      </div>
    );
  }

  const { entity } = selected;
  const nearby = getNearbyEntities(entity, 4);

  const typeIcon = {
    aircraft: Plane,
    ship: Ship,
    satellite: Satellite,
    launch: Rocket,
  }[entity.type];

  const Icon = typeIcon;

  return (
    <div className="w-80 flex flex-col bg-console-panel border-l border-console-border overflow-y-auto">
      <div className="flex items-start justify-between p-4 border-b border-console-border">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md bg-console-bg border border-console-border-subtle text-${entity.type}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-console-text leading-tight">{entity.name}</h2>
            <p className="text-[10px] text-console-dim font-mono uppercase">{entity.id}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-console-dim hover:text-console-text hover:bg-console-panel-raised">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-console-border-subtle text-console-muted uppercase">
            {entity.type}
          </Badge>
          <Badge variant="outline" className={`text-[10px] border-console-border-subtle ${entity.classification === "Hostile" ? "text-alert" : entity.classification === "Friendly" ? "text-ship" : "text-console-muted"}`}>
            {entity.classification}
          </Badge>
          {"affiliation" in entity && (
            <Badge variant="outline" className="text-[10px] border-console-border-subtle text-console-muted">
              {entity.affiliation}
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-console-dim">
            <span>Risk score</span>
            {entity.riskScore >= 70 && <AlertTriangle className="w-3 h-3 text-alert" />}
          </div>
          <RiskBar score={entity.riskScore} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
            <div className="flex items-center gap-1 text-console-dim mb-1">
              <Navigation className="w-3 h-3" />
              <span className="text-[10px] uppercase">Lat / Lon</span>
            </div>
            <p className="font-mono text-console-text">
              {entity.lat.toFixed(4)}, {entity.lon.toFixed(4)}
            </p>
          </div>

          {entity.type === "aircraft" && (
            <>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Wind className="w-3 h-3" />
                  <span className="text-[10px] uppercase">Speed</span>
                </div>
                <p className="font-mono text-console-text">{entity.velocityMs} kt</p>
              </div>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Activity className="w-3 h-3" />
                  <span className="text-[10px] uppercase">Altitude</span>
                </div>
                <p className="font-mono text-console-text">{entity.altitudeM} ft</p>
              </div>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Gauge className="w-3 h-3" />
                  <span className="text-[10px] uppercase">Heading</span>
                </div>
                <p className="font-mono text-console-text">{entity.headingDeg}°</p>
              </div>
            </>
          )}

          {entity.type === "ship" && (
            <>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Wind className="w-3 h-3" />
                  <span className="text-[10px] uppercase">Speed</span>
                </div>
                <p className="font-mono text-console-text">{entity.speedKn} kt</p>
              </div>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Gauge className="w-3 h-3" />
                  <span className="text-[10px] uppercase">Course</span>
                </div>
                <p className="font-mono text-console-text">{entity.courseDeg}°</p>
              </div>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Activity className="w-3 h-3" />
                  <span className="text-[10px] uppercase">Type</span>
                </div>
                <p className="font-mono text-console-text">{entity.shipType}</p>
              </div>
            </>
          )}

          {entity.type === "satellite" && (
            <>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Activity className="w-3 h-3" />
                  <span className="text-[10px] uppercase">Category</span>
                </div>
                <p className="font-mono text-console-text">{entity.category}</p>
              </div>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Gauge className="w-3 h-3" />
                  <span className="text-[10px] uppercase">NORAD ID</span>
                </div>
                <p className="font-mono text-console-text">{entity.noradId}</p>
              </div>
            </>
          )}

          {entity.type === "launch" && (
            <>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Activity className="w-3 h-3" />
                  <span className="text-[10px] uppercase">Provider</span>
                </div>
                <p className="font-mono text-console-text">{entity.provider}</p>
              </div>
              <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
                <div className="flex items-center gap-1 text-console-dim mb-1">
                  <Gauge className="w-3 h-3" />
                  <span className="text-[10px] uppercase">Pad</span>
                </div>
                <p className="font-mono text-console-text">{entity.padName}</p>
              </div>
            </>
          )}
        </div>

        <div className="p-2 rounded-md bg-console-bg border border-console-border-subtle">
          <div className="text-[10px] uppercase tracking-wider text-console-dim mb-1">Last updated</div>
          <p className="text-xs font-mono text-console-text">{formatTime(entity.updatedAt)}</p>
        </div>

        {nearby.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-console-dim">Nearby entities</div>
            <div className="space-y-1">
              {nearby.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    const found = [
                      ...mockDataset.aircraft,
                      ...mockDataset.ships,
                      ...mockDataset.satellites,
                      ...mockDataset.launches,
                    ].find((e) => e.id === n.id);
                    if (found) onSelectNearby(found);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-console-bg border border-console-border-subtle hover:border-primary/50 transition-colors text-left"
                >
                  <div>
                    <p className="text-xs text-console-text">{n.name}</p>
                    <p className="text-[10px] text-console-dim uppercase">{n.type}</p>
                  </div>
                  <span className="text-[10px] font-mono text-console-muted">{n.distanceNm} NM</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
