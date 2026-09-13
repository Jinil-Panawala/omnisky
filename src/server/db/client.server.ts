/**
 * Database clients for the backend. Nothing outside `src/server` should import
 * this file — services and repositories are the only consumers.
 *
 * - `getPublicClient()`  publishable key, RLS applies (public read-only data)
 * - `getAdminClient()`   service role, RLS bypassed (ingestion writes only)
 */

type PublicClient = Awaited<ReturnType<typeof createPublicClient>>;

// One client per worker instance: creating it per query allocated a new
// connection wrapper on every read the console made.
let publicClient: PublicClient | null = null;

/** Publishable-key client used for public reads from server functions. */
export async function getPublicClient(): Promise<PublicClient> {
  publicClient ??= await createPublicClient();
  return publicClient;
}

async function createPublicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Opaque `sb_` keys are not JWTs, so send only the apikey header.
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Service-role client. Ingestion writes only — never for user-scoped reads. */
export async function getAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
