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

    const body = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const seraResponse = await sera
          .handleRequest(
            seraRequest,
          );
        const text = JSON.stringify(seraResponse);

        // Convert text to Uint8Array
        const data = encoder.encode(text);

        // Push data into the stream
        console.log(
          `Enqueuing seraResponse:`,
          JSON.stringify(seraResponse, null, 2),
        );
        controller.enqueue(data);

        controller.close();
      },
    });

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
