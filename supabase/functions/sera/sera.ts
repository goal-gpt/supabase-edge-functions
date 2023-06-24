import {
  _internals as _privilegedRequestHandlerInternals,
  SeraResponse,
} from "./privilegedRequestHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";

export interface SeraRequest {
  message: string;
  chat?: number;
}

export class Sera {
  // TODO: determine if this name is good
  async handleRequest(seraRequest: SeraRequest): Promise<SeraResponse> {
    console.log("Handling request:", seraRequest);
    const model = _llmInternals.getChatOpenAI();
    const supabaseClient = _supabaseClientInternals.createClient();

    const seraResponse = await _privilegedRequestHandlerInternals
      .handleRequest(
        model,
        supabaseClient,
        seraRequest,
      );

    return seraResponse;
  }
}
