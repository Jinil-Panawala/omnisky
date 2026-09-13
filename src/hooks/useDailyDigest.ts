import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DailyDigest {
  digest_date: string;
  headline: string;
  summary: string;
  highlights: unknown;
}

/** Most recent daily digest, visible to signed-in users. */
export function useDailyDigest(enabled: boolean) {
  const [data, setData] = useState<DailyDigest | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void supabase
      .from("daily_digests")
      .select("digest_date, headline, summary, highlights")
      .order("digest_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: row }) => {
        if (!cancelled && row) setData(row as DailyDigest);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data };
}
