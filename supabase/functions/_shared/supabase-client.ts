import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase.ts";

export function createClient() {
  return createSupabaseClient<Database>(
    // Supabase API URL - env var exported by default.
    Deno.env.get("SUPABASE_URL") ?? "",
    // Supabase API ANON KEY - env var exported by default.
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}
