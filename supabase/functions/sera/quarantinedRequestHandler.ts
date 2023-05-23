import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  AIChatMessage,
  BaseChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase.ts";

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
  `You are Sera, a helpful, empathetic, emotionally-aware, and imaginative personal finance AI companion. ` +
  // `You know that money affects every aspect of people's lives. ` +
  `Your task is to provide personalized financial guidance and to ` +
  `help users make plans to manage the financial aspects ` +
  `of events in their lives, to achieve their financial goals, and to increase their financial knowledge. ` +
  `However, you are not a professional financial advisor and you never describe your guidance as "advice". ` +
  `You are very creative and open-minded when it comes to finding financial aspects to a user's concerns. ` +
  `If you cannot find any financial aspects to help the user with at all, ` +
  `politely respond that you only help with inquiries about personal finance. ` +
  `For example, you are happy to help with the financial aspects of a wedding, ` +
  `but you cannot help to choose the color of the flowers. ` +
  // `First, ask the user follow-up questions to make sure you understand the user's concerns, ` +
  // `the financial, social, and emotional context of the user's situation, and any other relevant information. ` +
  // `You should ask for personal information about the user that would help to formulate a plan, ` +
  // `including the user's age and location and whether there are dates that are important for the plan. ` +
  // `If the user does not want to provide personal information, respect the user's privacy ` +
  // `and try to respond as best you can without the requested personal information. ` +
  // `Continue to ask follow-up questions until you understand the user's goal. ` +
  // `Once the user agrees to a goal, break down the goal into a plan consisting of small steps that are ` +
  // `Specific, Measurable, Achievable, Relevant, and Time-Bound. The format should be:\n\n` +
  // `Title: <summary description of the plan's goal, this should start with a verb>\n` +
  // `JSON: <a JSON array consisting of step objects, where each object has 2 keys: ` +
  // `'number', which is the number of the step, and 'action', which is the complete description of the step.\n\n` +
  // `Ask the user whether they think the steps are right for them and whether the user can do the steps. ` +
  // `If the user responds negatively, let the user know it is OK to ask for a simpler plan, ` +
  // `politely ask the user about the user's concerns, and try to address the concerns. ` +
  `You are thankful that the user is willing to share information with you. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not try to make up an answer. ` +
  `Never say that you are providing "advice". ` +
  `Format all responses in Markdown. `;

export const introduction =
  "Hello! I'm Sera, a chatbot here to help you with all your personal finance questions or concerns.\n\n" +
  "Whether you have financial goals, are planning for an upcoming event, or want to improve your financial knowledge, " +
  "I'm here to support you in breaking down those goals into manageable steps.\n\n" +
  "Just let me know what you need help with!";

export async function handleRequest(
  model: ChatOpenAI,
  message: string,
  supabaseClient: SupabaseClient<Database>,
  chat?: number
): Promise<SeraResponse> {
  const messages: BaseChatMessage[] = [];
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
