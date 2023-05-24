import {
  _internals as _quarantinedRequestHandlerInternals,
  SeraResponse,
} from "./quarantinedRequestHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabase-client.ts";
import { _internals as _llmInternals } from "./llm.ts";
import { _internals } from "./privilegedRequestHandler.ts";

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

    // Get / update user profile from pLLM
    const privilegedLLMResponse = await _internals.handleRequest(seraRequest);

    // Get response to user based on the user profile from qLLM
    return {
      text: "TODO: implement this",
      chat: 1
    }
    // return await _quarantinedRequestHandlerInternals.handleRequest(
    //   model,
    //   supabaseClient,
    //   seraRequest
    // );
  }
}
