import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "http/server.ts";
import { Leela } from "./leela.ts";

serve(async (request: Request) => {
  const { url, method } = request;

  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const leela = new Leela();
    const urlPattern = new URLPattern({
      pathname: "/leela/:resource/:resourceID?",
    });
    const matchingPath = urlPattern.exec(url);
    const resource = matchingPath?.pathname.groups.resource;
    // const resourceID = matchingPath?.pathname.groups.resourceID;

    let leelaResponse;

    // Switch the handler based on the 'resource' field
    switch (resource) {
      case "plans":
        leelaResponse = await leela.handlePlanRequest(
          request,
          // resourceID,
        );
        break;
        // TODO: Add other handlers here
      default:
        throw new Error(`Unknown resource: ${resource}`);
    }

    return new Response(JSON.stringify(leelaResponse), {
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
