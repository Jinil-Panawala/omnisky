import { useEffect, useState } from "react";

/**
 * Dev/QA switches read from the URL once on mount:
 * `?stress=1` loads a synthetic dataset, `?stats=1` shows the render overlay.
 */
export interface ConsoleFlags {
  stress: boolean;
  stats: boolean;
  counts: [number, number, number];
}

const DEFAULTS: ConsoleFlags = { stress: false, stats: false, counts: [20000, 20000, 5000] };

export function useConsoleFlags(): ConsoleFlags {
  const [flags, setFlags] = useState<ConsoleFlags>(DEFAULTS);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const num = (key: string, fallback: number) => Number(params.get(key) ?? fallback) || fallback;
    const stress = params.get("stress") === "1";
    setFlags({
      stress,
      stats: params.get("stats") === "1" || stress || import.meta.env.DEV,
      counts: [num("aircraft", 20000), num("ships", 20000), num("sats", 5000)],
    });
  }, []);

  return flags;
}
