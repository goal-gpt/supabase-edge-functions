import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  AIChatMessage,
  BaseChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase.ts";
import { SeraRequest } from "./sera.ts";

async function getAllChatLines(
  supabaseClient: SupabaseClient<Database>,
  chat: number
): Promise<BaseChatMessage[]> {
  console.log("Getting all chat lines", chat);
  const { data, error } = await supabaseClient
    .from("chat_line")
    .select("*")
    .eq("chat", chat);
  if (error) throw error;

  const messages: BaseChatMessage[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i].message) {
      switch (data[i].sender) {
        case "ai":
          messages.push(new AIChatMessage(data[i].message!));
          break;
        case "human":
          messages.push(new HumanChatMessage(data[i].message!));
          break;
        case "system":
          messages.push(new SystemChatMessage(data[i].message!));
          break;
        default:
          throw new Error("Invalid chat line sender");
      }
    }
  }

  return messages;
}

async function createChatLine(
  supabaseClient: SupabaseClient<Database>,
  message: BaseChatMessage,
  chat?: number
) {
  console.log("Creating chat line", message.text, chat);

  const { data: chatLine, error } = await supabaseClient
    .from("chat_line")
    .insert({ chat: chat, message: message.text, sender: message._getType() })
    .select();
  if (error) throw error;
  console.log("Created chat line", chatLine);
}

async function createChat(
  supabaseClient: SupabaseClient<Database>
): Promise<number> {
  console.log("Creating chat");
  const { data, error } = await supabaseClient.from("chat").insert({}).select();
  if (error) throw error;

  const chat = data[0].id;
  console.log("Created chat", chat);
  return chat;
}

export interface SeraResponse {
  text: string;
  chat: number;
}

export const initialPrompt =
  `You are Sera, a helpful and empathetic AI personal finance companion. ` +
  `Your task is to provide personalized answers to financial questions. ` +
  `However, you are not a professional financial advisor and you never describe your guidance as "advice". ` +
  `When the user asks a question, ask the user follow-up questions. ` +
  `You want to make sure you understand why the user has the question, the user's concerns, ` +
  `the financial, social, and emotional context of the user's situation, and you want to know` +
  `any personal information and specific values such as deadlines ` +
  `or monetary amounts that are relevant to answering the question. ` +
  `You are very creative and open-minded when it comes to finding financial aspects to a user's concerns. ` +
  `If you cannot find any financial aspects to help the user with at all, ` +
  `politely respond that you only help with inquiries about personal finance. ` +
  `Then answer the user's question. ` +
  `If the user does provide additional information, try to respond as best you can ` +
  `without the additional information. ` +
  `You are thankful that the user is willing to share information with you. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not try to make up an answer. ` +
  `Never say that you are providing "advice". ` +
  `Format all responses in Markdown. `;

export const introduction =
  "Hello! I'm Sera, a chatbot here to help you with all your personal finance questions.\n\n" +
  "Let me know what you need help with!";

export async function handleRequest(
  model: ChatOpenAI,
  supabaseClient: SupabaseClient<Database>,
  request: SeraRequest
): Promise<SeraResponse> {
  const messages: BaseChatMessage[] = [];
  const message = request.message;
  let chat = request.chat;

  if (chat) {
    // TODO: Consider replacing with database function or call to database REST API
    messages.push(...(await _internals.getAllChatLines(supabaseClient, chat)));
  } else {
    chat = await _internals.createChat(supabaseClient);

    const systemChatMessage = new SystemChatMessage(initialPrompt);

    await _internals.createChatLine(supabaseClient, systemChatMessage, chat);
    messages.push(systemChatMessage);

    // No chat history and an empty message means the client is requesting an introduction
    // N.B.:
    //  - the introduction is saved to the database to prevent Sera reintroducing herself
    // TODO: Determine if empty messages should be saved in the database
    if (message.length === 0) {
      console.log("User message is empty. Adding introduction to messages.");
      const aiChatMessage = new AIChatMessage(introduction);

      await _internals.createChatLine(supabaseClient, aiChatMessage, chat);

      const seraResponse: SeraResponse = {
        text: introduction,
        chat: chat,
      };

      console.log("Returning introduction");
      return seraResponse;
    }
  }

  const humanChatMessage = new HumanChatMessage(message);

  await _internals.createChatLine(supabaseClient, humanChatMessage, chat);
  messages.push(humanChatMessage);

  console.log("Calling OpenAI", messages);
  const response = await model.call(messages);

  console.log("Received response from OpenAI", response.text);

  const aiChatMessage = new AIChatMessage(response.text);

  await _internals.createChatLine(supabaseClient, aiChatMessage, chat);

  const seraResponse: SeraResponse = {
    text: response.text,
    chat: chat,
  };

  console.log("Returning response from LLM:", seraResponse);
  return seraResponse;
}

// _internals are used for testing
export const _internals = {
  handleRequest,
  createChat,
  createChatLine,
  getAllChatLines,
};
