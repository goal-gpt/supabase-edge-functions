import { _internals as _llmInternals, ModelsContext } from "../_shared/llm.ts";
import { _internals as _reminderInternals, Quote, Task } from "./reminder.ts";

export interface ElroyRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  user: string;
  task: Task;
  quote?: Quote;
}

export class Elroy {
  async handleRequest(elroyRequest: ElroyRequest) {
    console.log("Handling request:", JSON.stringify(elroyRequest, null, 2));
    const modelsContext: ModelsContext = {
      chat: _llmInternals.getChatOpenAI(),
      embed: _llmInternals.getEmbeddingsOpenAI(),
      splitter: _llmInternals.getTextSplitter(),
    };

    await _reminderInternals.handleRequest(
      modelsContext,
      elroyRequest,
    );
  }
}
