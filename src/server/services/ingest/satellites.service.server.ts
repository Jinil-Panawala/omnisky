// CelesTrak TLE adapter. Free, keyless. Orbits are propagated in the browser.
import { recordSourceHealth, type IngestResult } from "./shared.server";

export const SATELLITE_SOURCE = "celestrak";

const GROUPS: Array<[string, string]> = [
  ["stations", "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"],
  ["visual", "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle"],
  ["noaa", "https://celestrak.org/NORAD/elements/gp.php?GROUP=noaa&FORMAT=tle"],
  ["goes", "https://celestrak.org/NORAD/elements/gp.php?GROUP=goes&FORMAT=tle"],
  ["gps", "https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle"],
  ["starlink", "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle"],
];
const PER_GROUP_CAP: Record<string, number> = { starlink: 200 };
const DEFAULT_CAP = 200;

interface TleRecord {
  norad_id: number;
  name: string;
  tle_line1: string;
  tle_line2: string;
  category: string;
}

function parseTle(text: string, category: string): TleRecord[] {
  const lines = text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  const out: TleRecord[] = [];
  for (let i = 0; i + 2 <= lines.length; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!name || !l1?.startsWith("1 ") || !l2?.startsWith("2 ")) continue;
    const norad = Number.parseInt(l1.slice(2, 7).trim(), 10);
    if (Number.isNaN(norad)) continue;
    out.push({
      norad_id: norad,
      name: name.trim(),
      tle_line1: l1,
      tle_line2: l2,
      category,
    });
  }
  return out;
}

export async function ingestSatellites(): Promise<IngestResult> {
  try {
    const all: Array<TleRecord & { updated_at: string }> = [];
    const seen = new Set<number>();
    for (const [group, url] of GROUPS) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) continue;
        const text = await res.text();
        const cap = PER_GROUP_CAP[group] ?? DEFAULT_CAP;
        for (const rec of parseTle(text, group).slice(0, cap)) {
          if (seen.has(rec.norad_id)) continue;
          seen.add(rec.norad_id);
          all.push({ ...rec, updated_at: new Date().toISOString() });
        }
      } catch (e) {
        console.error(`celestrak group ${group} failed`, e);
      }
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const BATCH = 500;
    let upserted = 0;
    for (let i = 0; i < all.length; i += BATCH) {
      const { error } = await supabaseAdmin
        .from("satellite_tles")
        .upsert(all.slice(i, i + BATCH), { onConflict: "norad_id" });
      if (error) throw new Error(error.message);
      upserted += Math.min(BATCH, all.length - i);
    }
    await recordSourceHealth(SATELLITE_SOURCE, { rows: upserted });
    return { source: SATELLITE_SOURCE, upserted };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await recordSourceHealth(SATELLITE_SOURCE, { error: message });
    throw e;
  }
}
