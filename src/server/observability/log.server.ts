/**
 * One logging entry point for the backend. Every server-side message goes
 * through here so the output has a consistent, greppable shape:
 *
 *   [omnisky:ingest.aircraft] ADSB.lol [429]
 *
 * Direct `console.*` calls in `src/server` should be replaced by these.
 */

export type LogScope = string;

function format(level: string, scope: LogScope, message: string): string {
  return `${level} [omnisky:${scope}] ${message}`;
}

function detail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const log = {
  info(scope: LogScope, message: string, meta?: unknown) {
    console.log(format("INFO", scope, message), meta ?? "");
  },
  warn(scope: LogScope, message: string, meta?: unknown) {
    console.warn(format("WARN", scope, message), meta ?? "");
  },
  error(scope: LogScope, message: string, error?: unknown) {
    console.error(format("ERROR", scope, message), error ? detail(error) : "");
  },
};

/** Normalises anything thrown into a printable message. */
export const errorMessage = detail;
