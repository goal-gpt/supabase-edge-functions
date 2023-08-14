import {
  _internals as _supabaseClientInternals,
} from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals, ModelsContext } from "../_shared/llm.ts";
import { Plan } from "../_shared/plan.ts";
import { _internals as _planDetailerInternals } from "./planDetailer.ts";

export interface WesleyRequest {
  messages: string;
  plan: Plan;
}

export class Wesley {
  async handleRequest(wesleyRequest: WesleyRequest) {
    console.log("Handling request:", wesleyRequest);
    const modelsContext: ModelsContext = {
      chat: _llmInternals.getChatOpenAI(),
      embed: _llmInternals.getEmbeddingsOpenAI(),
      splitter: _llmInternals.getTextSplitter(),
    };
    const supabaseClient = _supabaseClientInternals.createClient();

    await _planDetailerInternals.handleRequest(
      modelsContext,
      supabaseClient,
      wesleyRequest,
    );
  }
}
