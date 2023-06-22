import { _internals as _supabaseClientInternals } from "../_shared/supabase-client.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "http/server.ts";
import { Connor } from "./connor.ts";

serve(async (request: Request) => {
  try {
    if (request.method === "OPTIONS") {
      console.log("Handling CORS preflight request");
      return new Response("ok", { headers: corsHeaders });
    }

    const connor = new Connor();
    const contentRequest = await request.json();
    const responseFromContent = await connor.handleRequest(contentRequest);

    return new Response(JSON.stringify(responseFromContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
