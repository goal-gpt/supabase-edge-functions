import { serve } from "http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Sera } from "./sera.ts";
import { PlanArtifacts, SeraResponse } from "./privilegedRequestHandler.ts";

function streamPlanWithoutIdeas(
  seraResponse: SeraResponse,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const enqueueableDescription = "basePlanArtifacts.seraResponse";
  streamPlan(enqueueableDescription, seraResponse, controller, encoder);
}

function streamPlanWithIdeas(
  seraResponse: SeraResponse,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const enqueueableDescription = "planWithIdeasArtifacts.seraResponse";
  streamPlan(enqueueableDescription, seraResponse, controller, encoder);
}

function streamPlan(
  enqueueableDescription: string,
  seraResponse: SeraResponse,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const text = JSON.stringify(seraResponse);

  // Convert text to Uint8Array
  const data = encoder.encode(text);

  // Push data into the stream
  console.log(
    `Enqueuing ${enqueueableDescription}:`,
    JSON.stringify(seraResponse, null, 2)
  );
  controller.enqueue(data);
  /* End streaming base plan without ideas */
}

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

        streamPlanWithoutIdeas(
          basePlanArtifacts.seraResponse,
          controller,
          encoder
        );

        /* Stream plan with ideas */
        const planWithIdeasArtifacts: PlanArtifacts =
          await sera.handleAddingIdeasToPlan(basePlanArtifacts);

        streamPlanWithIdeas(
          planWithIdeasArtifacts.seraResponse,
          controller,
          encoder
        );

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
