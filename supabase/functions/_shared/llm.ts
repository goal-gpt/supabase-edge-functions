import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import GPT3Tokenizer from "tokenizer";
import { MatchDocumentsResponse } from "./supabaseClient.ts";

export interface ModelsContext {
  chat: ChatOpenAI;
  embed: OpenAIEmbeddings;
  splitter: RecursiveCharacterTextSplitter;
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

export function getTextSplitter(
  chunkSize = 256,
  chunkOverlap = 50, // Recommended 20% overlap
): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap,
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

export function truncateDocuments(
  documents: MatchDocumentsResponse,
  limit = 1500,
): string {
  let tokenCount = 0;
  let text = "";

  const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
  for (let i = 0; i < documents.length; i++) {
    const document = documents[i];
    const { link, title, raw_content: rawContent } = document;
    const encoded = tokenizer.encode(rawContent);
    tokenCount += encoded.text.length;

    if (tokenCount > limit) {
      break;
    }

    text += `[${title}](${link}) - ${rawContent.trim()}\n|\n`;
  }
  return text;
}

export async function getChunkedDocuments(
  model: RecursiveCharacterTextSplitter,
  text: string,
): Promise<Document[]> {
  return await model.createDocuments([text]);
}

// _internals are used for testing
export const _internals = {
  getChunkedDocuments,
  getChatOpenAI,
  getEmbeddingsOpenAI,
  getEmbeddingString,
  getTextSplitter,
  truncateDocuments,
};

// Re-export types for convenience
export type {
  ChatOpenAI,
  Document,
  OpenAIEmbeddings,
  RecursiveCharacterTextSplitter,
};
