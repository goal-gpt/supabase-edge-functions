import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

export interface ModelsContext {
  chat: ChatOpenAI;
  embed: OpenAIEmbeddings;
}

export function getChatOpenAI(): ChatOpenAI {
  return new ChatOpenAI({
    openAIApiKey: Deno.env.get("OPENAI_API_KEY"),
    temperature: 0,
    modelName: "gpt-3.5-turbo",
    verbose: true,
  });
}

export function getEmbeddingsOpenAI(): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    openAIApiKey: Deno.env.get("OPENAI_API_KEY"),
    modelName: "text-embedding-ada-002",
    verbose: true,
  });
}

export async function getEmbeddingString(
  model: OpenAIEmbeddings,
  rawContent: string,
): Promise<string> {
  const preparedContent = rawContent.replace(/\n/g, " ");
  const embeddingVector = await model.embedQuery(preparedContent);
  return JSON.stringify(embeddingVector);
}

// _internals are used for testing
export const _internals = {
  getChatOpenAI,
  getEmbeddingsOpenAI,
  getEmbeddingString,
  ChatOpenAI,
  OpenAIEmbeddings,
};
