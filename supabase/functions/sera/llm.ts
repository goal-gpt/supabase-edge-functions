import { ChatOpenAI } from "langchain/chat_models/openai";

export function getChatOpenAI(): ChatOpenAI {
  return new ChatOpenAI({
    openAIApiKey: Deno.env.get("OPENAI_API_KEY"),
    temperature: 0,
    modelName: "gpt-3.5-turbo",
    verbose: true,
  });
}

// _internals are used for testing
export const _internals = {
  getChatOpenAI,
};
