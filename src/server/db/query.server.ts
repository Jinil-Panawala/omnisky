/**
 * Small helpers shared by every repository.
 *
 * Supabase query builders return `{ data, error }`, and the repositories used
 * to drop `error` on the floor — a failed SELECT looked exactly like an empty
 * table. These helpers surface the failure in the logs and keep the casting to
 * row types in one place instead of at every call site.
 */
import { log } from "@/server/observability/log.server";

interface Result<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Runs a SELECT that returns many rows; logs failures and yields []. */
export async function rows<T>(
  scope: string,
  query: PromiseLike<Result<unknown>>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    log.error(`db.${scope}`, "select failed", error.message);
    return [];
  }
  return (data ?? []) as T[];
}

/** Runs a SELECT expected to return a single row (or none). */
export async function row<T>(
  scope: string,
  query: PromiseLike<Result<unknown>>,
): Promise<T | null> {
  const { data, error } = await query;
  if (error) {
    log.error(`db.${scope}`, "select failed", error.message);
    return null;
  }
  return (data ?? null) as T | null;
}

/** Runs a write; throws with the database message so callers can react. */
export async function mutate(
  scope: string,
  query: PromiseLike<Result<unknown>>,
): Promise<void> {
  const { error } = await query;
  if (error) throw new Error(`${scope}: ${error.message}`);
}
