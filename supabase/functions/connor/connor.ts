import {
  _internals as _supabaseClientInternals,
  InsertResponse,
} from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { _internals as _contentHandlerInternals } from "./contentHandler.ts";

export interface ConnorRequest {
  url: string;
  userId: string;
  rawContent?: string;
  shareable?: boolean;
  title?: string;
}

export class Connor {
  async handleRequest(connorRequest: ConnorRequest): Promise<InsertResponse> {
    console.log("Handling request:", connorRequest);
    const supabaseClient = _supabaseClientInternals.createClient();
    const model = _llmInternals.getEmbeddingsOpenAI();

    return await _contentHandlerInternals.handleRequest(
      model,
      supabaseClient,
      connorRequest,
    );
  }
}
