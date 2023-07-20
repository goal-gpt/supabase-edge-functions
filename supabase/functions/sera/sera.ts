import {
  _internals as _privilegedRequestHandlerInternals,
  SeraResponse,
} from "./privilegedRequestHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals, ModelsContext } from "../_shared/llm.ts";

export interface SeraRequest {
  message: string;
  chat?: number;
}

export class Sera {
  // TODO: determine if this name is good
  async handleRequest(seraRequest: SeraRequest): Promise<SeraResponse> {
    console.log("Handling request:", seraRequest);
    const supabaseClient = _supabaseClientInternals.createClient();
    const modelsContext: ModelsContext = {
      chat: _llmInternals.getOpenAIWrapper(),
      embed: _llmInternals.getEmbeddingsOpenAI(),
      splitter: _llmInternals.getTextSplitter(),
    };

    return await _privilegedRequestHandlerInternals.handleRequest(
      modelsContext,
      supabaseClient,
      seraRequest,
    );
  }
}
