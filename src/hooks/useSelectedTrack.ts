import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Entity } from "@/domain/console";
import { getObjectTrack } from "@/api/live.functions";

/** Recent position history for the selected aircraft or ship, if trackable. */
export function useSelectedTrack(entity: Entity | undefined, enabled: boolean) {
  const fetchTrack = useServerFn(getObjectTrack);

  const trackable =
    enabled && entity
      ? entity.type === "aircraft"
        ? { craftType: "aircraft" as const, craftId: entity.icao24 }
        : entity.type === "ship"
          ? { craftType: "ship" as const, craftId: entity.mmsi }
          : null
      : null;

  const query = useQuery({
    queryKey: ["object-track", trackable?.craftType, trackable?.craftId],
    queryFn: () => fetchTrack({ data: trackable! }),
    enabled: !!trackable,
    staleTime: 30_000,
  });

  return query.data?.map((p) => ({ lat: p.lat, lon: p.lon }));
}
