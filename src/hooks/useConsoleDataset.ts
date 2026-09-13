import { useMemo } from "react";
import type { Entity, FacetOption, Filters, LayerVisibility } from "@/domain/console";
import { MAX_FACET_OPTIONS } from "@/domain/constants";

/**
 * Turns the raw object list into everything the console shell renders:
 * the filtered set for the globe, the counter tally and the filter facets.
 * Pure derivation — no fetching happens here.
 */
export function useConsoleDataset(
  allEntities: Entity[],
  layers: LayerVisibility,
  filters: Filters,
  alertCount: number,
) {
  const filteredEntities = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return allEntities.filter((e) => {
      if (!layers[e.type]) return false;
      if (e.riskScore < filters.riskRange[0] || e.riskScore > filters.riskRange[1]) return false;
      if (
        filters.affiliations.length > 0 &&
        !("affiliation" in e && filters.affiliations.includes(e.affiliation))
      ) {
        return false;
      }
      if (filters.classifications.length > 0 && !filters.classifications.includes(e.classification)) {
        return false;
      }
      if (search) {
        const hay = `${e.name} ${e.id} ${e.type} ${"callsign" in e ? e.callsign : ""} ${
          "mmsi" in e ? e.mmsi : ""
        }`.toLowerCase();
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
    return { ...tally, alerts: alertCount };
  }, [allEntities, alertCount]);

  // Filter choices come from the data actually in play, with live counts.
  const facets = useMemo(() => {
    const affiliations = new Map<string, number>();
    const classifications = new Map<string, number>();
    for (const e of allEntities) {
      if (!layers[e.type]) continue;
      if ("affiliation" in e && e.affiliation) {
        affiliations.set(e.affiliation, (affiliations.get(e.affiliation) ?? 0) + 1);
      }
      if (e.classification) {
        classifications.set(e.classification, (classifications.get(e.classification) ?? 0) + 1);
      }
    }
    return {
      affiliations: topOptions(affiliations),
      classifications: topOptions(classifications),
    };
  }, [allEntities, layers]);

  return { filteredEntities, counts, facets };
}

function topOptions(counts: Map<string, number>): FacetOption[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_FACET_OPTIONS)
    .map(([value, count]) => ({ value, count }));
}
