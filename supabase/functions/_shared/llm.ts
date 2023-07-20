import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatCompletionFunctions,
  ChatCompletionRequestMessageFunctionCall,
} from "../../types/openai.ts";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";
import { BaseChatMessage } from "langchain/schema";
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
    text += `[${title}](${link}) - ${rawContent.trim()}\n|\n`;
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

export const getPlanSchema: ChatCompletionFunctions = {
  name: "get_plan",
  description: "Get a plan for the user.",
  parameters: {
    type: "object",
    required: ["summary", "goal", "steps"],
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
        description:
          "An empathetic message describing the changes made to the user's plan. Max. 3 sentences.",
      },
      goal: {
        type: "string",
        description:
          "The specific, measurable, achievable, relevant, and time-bound goal of the plan that starts with a verb.",
      },
      steps: {
        type: "array",
        description: "The steps of the plan",
        items: {
          type: "object",
          required: ["number", "action"],
          additionalProperties: false,
          properties: {
            number: {
              type: "number",
              description: "The number of the step.",
            },
            action: {
              type: "object",
              required: ["name", "description", "ideas"],
              additionalProperties: false,
              properties: {
                name: {
                  type: "string",
                  description: "The name of the action.",
                },
                description: {
                  type: "string",
                  description:
                    "An AI message to the user that describes the action and how it helps achieve the goal. This should be specific, measurable, achievable, relevant, and time-bound. Max 2 sentences.",
                },
                links: {
                  type: "array",
                  description:
                    "Links to relevant resources from the context. Max. 3 links. These are real sites. Do not make up URLs. Only use unique links from context.",
                  items: {
                    type: "string",
                  },
                },
                ideas: {
                  type: "object",
                  properties: {
                    mostObvious: {
                      type: "string",
                      description:
                        "An AI message to the user that describes the most obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence.",
                    },
                    leastObvious: {
                      type: "string",
                      description:
                        "An AI message to the user that describes the least obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence. Add links to relevant resources from the context.",
                    },
                    inventiveOrImaginative: {
                      type: "string",
                      description:
                        "An AI message to the user that describes the most inventive or imaginative way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence. Add links to relevant resources from the context.",
                    },
                    rewardingOrSustainable: {
                      type: "string",
                      description:
                        "An AI message to the user that describes the most rewarding or sustainable way for the user to execute this step of this plan, tailored to their goal. Do not suggest credit cards. Max. 1 sentence.Add links to relevant resources from the context.",
                    },
                  },
                  required: [
                    "mostObvious",
                    "leastObvious",
                    "inventiveOrImaginative",
                    "rewardingOrSustainable",
                  ],
                  additionalProperties: false,
                },
              },
            },
          },
        },
      },
    },
  },
};

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
