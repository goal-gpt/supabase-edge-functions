import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient(req: Request) {
  return createSupabaseClient(
    // Supabase API URL - env var exported by default.
    Deno.env.get("SUPABASE_URL") ?? "",
    // Supabase API ANON KEY - env var exported by default.
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}
