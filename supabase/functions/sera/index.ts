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

    const body = new ReadableStream({
      start(controller) {
        const text = JSON.stringify(responseFromSera);
        const encoder = new TextEncoder();

        // Convert the JSON string to Uint8Array
        const data = encoder.encode(text);

        // Push the data into the stream
        controller.enqueue(data);
        controller.close();
      },
    });

    console.log("Responding with:", responseFromSera);
    return new Response(body, {
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
