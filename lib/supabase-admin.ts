import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * CYBER WARS :: ADMIN CLIENT (server-only)
 * Service-role Supabase client. NEVER import this from a client component and
 * never expose the key via a NEXT_PUBLIC_ variable. All dashboard data flows
 * through the PIN-gated /api routes which use this client.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    _client = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
