import {
  _internals as _supabaseClientInternals,
} from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals, ModelsContext } from "../_shared/llm.ts";
import { _internals as _contentHandlerInternals } from "./contentHandler.ts";

export interface ConnorRequest {
  url: string;
  userId: string;
  rawContent?: string;
  shareable?: boolean;
  title?: string;
}

export class Connor {
  async handleRequest(connorRequest: ConnorRequest): Promise<void> {
    console.log("Handling request:", connorRequest);
    const supabaseClient = _supabaseClientInternals.createClient();
    const modelsContext: ModelsContext = {
      chat: _llmInternals.getChatOpenAI(),
      embed: _llmInternals.getEmbeddingsOpenAI(),
      splitter: _llmInternals.getTextSplitter(),
    };

    return await _contentHandlerInternals.handleRequest(
      modelsContext,
      supabaseClient,
      connorRequest,
    );
  }
}
