import { useCallback, useState } from "react";
import type { PanelVisibility } from "@/domain/console";

/** Which side panels are open; users hide them to widen the map. */
export function usePanelVisibility(initial?: Partial<PanelVisibility>) {
  const [panels, setPanels] = useState<PanelVisibility>({
    filters: true,
    alerts: true,
    feed: true,
    details: true,
    ...initial,
  });

  const togglePanel = useCallback((key: keyof PanelVisibility) => {
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { panels, togglePanel };
}
