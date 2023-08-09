import { serve } from "http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Sera } from "./sera.ts";

serve(async (request: Request) => {
  try {
    if (request.method === "OPTIONS") {
      console.log("Handling CORS preflight request");
      return new Response("ok", { headers: corsHeaders });
    }

    const sera = new Sera();
    const seraRequest = await request.json();
    const responseFromSera = await sera.handleRequest(seraRequest);

    return new Response(JSON.stringify(responseFromSera), {
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
