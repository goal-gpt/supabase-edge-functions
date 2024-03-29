import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatCompletionFunctions,
  ChatCompletionRequestMessageFunctionCall,
} from "../../types/openai.ts";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";
import {
  BaseChatMessage,
  FunctionChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PromptTemplate } from "langchain/prompts";
import GPT3Tokenizer from "tokenizer";
import {
  _internals as _supabaseClientInternals,
  MatchDocumentsResponse,
  SupabaseClient,
} from "../_shared/supabaseClient.ts";
import { Database } from "../../types/supabase.ts";

export type ModelsContext = {
  chat: ChatOpenAI;
  embed: OpenAIEmbeddings;
  splitter: RecursiveCharacterTextSplitter;
};

export function getChatOpenAI(): ChatOpenAI {
  return new ChatOpenAI({
    openAIApiKey: Deno.env.get("OPENAI_API_KEY"),
    temperature: 0,
    modelName: "gpt-3.5-turbo-0613",
    verbose: true,
    n: 1,
    topP: 0.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
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
  chunkSize = 512,
  chunkOverlap = 100, // Recommended 20% overlap
): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap,
  });
}

async function embedAndGetSimilarDocuments(
  model: OpenAIEmbeddings,
  supabaseClient: SupabaseClient<Database>,
  embeddable: string,
  matchCount = 10,
): Promise<MatchDocumentsResponse> {
  const embeddingString = await _internals.getEmbeddingString(
    model,
    embeddable,
  );

  console.log(`Getting up to ${matchCount} similar documents for embedding...`);

  const documents = await _supabaseClientInternals.getSimilarDocuments(
    supabaseClient,
    embeddingString,
    0.78,
    matchCount,
  );
  return documents;
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
): { links: string[]; text: string } {
  let tokenCount = 0;
  let text = "";
  const linkSet = new Set<string>();

  const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
  for (let i = 0; i < documents.length; i++) {
    const document = documents[i];
    const { link, title, raw_content: rawContent } = document;
    const encoded = tokenizer.encode(rawContent);
    tokenCount += encoded.text.length;

    if (tokenCount > limit) {
      break;
    }

    linkSet.add(`[${title}](${link})`);
    text += `[${title}](${link}) - ${rawContent.trim()} | `;
  }
  const links = Array.from(linkSet);
  return { links, text };
}

export async function getChunkedDocuments(
  model: RecursiveCharacterTextSplitter,
  text: string,
): Promise<Document[]> {
  return await model.createDocuments([text]);
}

export async function getChatCompletion(
  model: ChatOpenAI,
  messages: BaseChatMessage[],
): Promise<BaseChatMessage> {
  return await model.call(messages);
}

export function getMessagesForSystemMessage(messages: BaseChatMessage[]) {
  const mappedMessages = messages.map((m) => m._getType() + ": " + m.text);
  return mappedMessages.join("\n");
}

export async function getSystemMessage(
  prompt: PromptTemplate,
  premise: string,
  internalData: string,
  externalData: string,
): Promise<SystemChatMessage> {
  const input = await prompt.format({
    premise,
    internal_data: internalData,
    external_data: externalData,
  });
  return new SystemChatMessage(input);
}

export async function getPredictedFunctionInputs(
  model: ChatOpenAI,
  messages: BaseChatMessage[],
  functions: ChatCompletionFunctions[],
  function_call?: string,
): Promise<ChatCompletionRequestMessageFunctionCall> {
  const response = await model.predictMessages(messages, {
    functions,
    function_call: function_call
      ? {
        name: function_call,
      }
      : "auto",
  });
  if (!response.additional_kwargs.function_call) {
    throw new Error("No function call found in response");
  }
  console.log("Predicted function inputs: ", response);
  return response.additional_kwargs.function_call;
}

export function cleanJsonResponse(
  response: ChatCompletionRequestMessageFunctionCall,
) {
  const regex = /\,(?=\s*?[\}\]])/g;
  const cleaned = response.arguments?.replace(regex, "") || "{}";
  return JSON.parse(cleaned);
}

// _internals are used for testing
export const _internals = {
  cleanJsonResponse,
  embedAndGetSimilarDocuments,
  getChatCompletion,
  getChatOpenAI,
  getChunkedDocuments,
  getEmbeddingString,
  getEmbeddingsOpenAI,
  getMessagesForSystemMessage,
  getPredictedFunctionInputs,
  getSystemMessage,
  getTextSplitter,
  truncateDocuments,
};

// Re-exported for convenience
export {
  BaseChatMessage,
  ChatOpenAI,
  Document,
  FunctionChatMessage,
  HumanChatMessage,
  OpenAIEmbeddings,
  RecursiveCharacterTextSplitter,
  SystemChatMessage,
};
