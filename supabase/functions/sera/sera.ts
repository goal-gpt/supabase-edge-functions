import {
  _internals as _privilegedRequestHandlerInternals,
  PlanArtifacts,
} from "./privilegedRequestHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";

export interface SeraRequest {
  message: string;
  chat?: number;
}

export class Sera {
  // TODO: determine if this name is good
  async handleRequest(seraRequest: SeraRequest): Promise<PlanArtifacts> {
    console.log("Handling request:", seraRequest);
    const model = _llmInternals.getChatOpenAI();
    const supabaseClient = _supabaseClientInternals.createClient();

    const planArtifacts = await _privilegedRequestHandlerInternals
      .handleRequest(
        model,
        supabaseClient,
        seraRequest,
      );

    return planArtifacts;
  }

  async handleAddingIdeasToPlan(
    planArtifacts: PlanArtifacts,
  ): Promise<PlanArtifacts> {
    console.log("Handling adding ideas to plan:", planArtifacts);
    const model = _llmInternals.getChatOpenAI();
    const supabaseClient = _supabaseClientInternals.createClient();

    const plan = await _privilegedRequestHandlerInternals.addIdeasToPlan(
      model,
      supabaseClient,
      planArtifacts,
    );

    planArtifacts.seraResponse.plan = plan;

    return planArtifacts;
  }
}
