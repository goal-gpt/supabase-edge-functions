import { serve } from "http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Sera } from "./sera.ts";
import { PlanArtifacts } from "./privilegedRequestHandler.ts";

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

        /* Stream base plan without ideas */
        const basePlanArtifacts: PlanArtifacts = await sera.handleRequest(
          seraRequest
        );
        const seraResponseText = JSON.stringify(basePlanArtifacts.seraResponse);

        // Convert seraResponseText to Uint8Array
        const seraResponseTextData = encoder.encode(seraResponseText);

        // Push seraResponseTextData into the stream
        console.log(
          "Enqueuing basePlanArtifacts.seraResponse:",
          JSON.stringify(basePlanArtifacts.seraResponse, null, 2)
        );
        controller.enqueue(seraResponseTextData);
        /* End streaming base plan without ideas */

        /* Stream plan with ideas */
        const planWithIdeasArtifacts: PlanArtifacts =
          await sera.handleAddingIdeasToPlan(basePlanArtifacts);
        const seraResponseTextWithIdeas = JSON.stringify(
          planWithIdeasArtifacts.seraResponse
        );
        // Convert seraResponseTextWithIdeas to Uint8Array
        const seraResponseTextWithIdeasData = encoder.encode(
          seraResponseTextWithIdeas
        );

        // Push seraResponseTextWithIdeasData into the stream
        console.log(
          "Enqueuing planWithIdeasArtifacts.seraResponse:",
          JSON.stringify(planWithIdeasArtifacts.seraResponse, null, 2)
        );
        controller.enqueue(seraResponseTextWithIdeasData);
        /* End streaming base plan without ideas */

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
