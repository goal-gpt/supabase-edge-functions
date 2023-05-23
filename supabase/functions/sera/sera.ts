import {
  _internals as _privilegedRequestHandlerInternals,
  SeraResponse,
} from "./privilegedRequestHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabase-client.ts";
import { _internals as _llmInternals } from "./llm.ts";

export interface SeraRequest {
  message: string;
  chat?: number;
}

export class Sera {
  // TODO: determine if this name is good
  async handleRequest(seraRequest: SeraRequest): Promise<SeraResponse> {
    console.log("Handling request:", seraRequest);
    const supabaseClient = _supabaseClientInternals.createClient();
    const model = _llmInternals.getChatOpenAI();

    return await _privilegedRequestHandlerInternals.handleRequest(
      model,
      seraRequest.message,
      supabaseClient,
      seraRequest.chat
    );
  }
}
