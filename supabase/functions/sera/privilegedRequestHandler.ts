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
import { ZodTypeAny, z } from "zod";
import { PromptTemplate } from "langchain/prompts";

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

export interface Step {
  number: number;
  action: string;
}

export interface Plan {
  goal: string;
  steps: Step[];
}

export interface SeraResponse {
  text: string;
  question?: string;
  chat: number;
  plan?: Plan;
}

export const initialPrompt =
  `You are an empathetic, emotionally-aware, and imaginative personal finance planning AI. ` +
  `You are very creative and open-minded when it comes to finding financial aspects to requests. ` +
  `When a user makes a request, try to respond with a financial plan, regardless of the request. ` +
  `If you have already made a plan, use information in the request to update the plan. ` +
  `The plan should consist of small steps that are ` +
  `specific, measurable, achievable, relevant, and time-bound. The format should be:\n\n` +
  `Goal: <summary description of the plan's goal, this should start with a verb>\n` +
  `JSON: <a JSON array consisting of step objects, where each object has 2 keys: ` +
  `'number', which is the number of the step, and 'action', which is the complete description of the step.\n\n` +
  `If you cannot find any financial aspects to a request, ` +
  `try to respond with a plan to reduce the costs or increase the earnings from buying, selling, visiting, using, or achieving the subject of the request. ` +
  `If you cannot find any financial aspects to the request at all, ` +
  `politely respond that you only help with inquiries about personal finance. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not try to make up an answer. ` +
  `Never say that you are providing "advice". ` +
  `Format all responses in Markdown. `;

// TODO: this results in a type error when used with the StructuredOutputParser: "TS2589 [ERROR]: Type instantiation is excessively deep and possibly infinite."
//       For now, I've hard-coded the output as a template literal, "format_instructions", for the prompt
// underscore prefix is to tell Deno lint to ignore this unused variable
const _responseWithJsonSchema: ZodTypeAny = z.object({
  text: z
    .string()
    .describe(
      "The AI message to send to the user without the JSON plan formatted in Markdown."
    ),
  question: z
    .string()
    .describe(
      "An AI message asking the user if the plan is right for them and if they can do the steps, formatted in Markdown."
    ),
  plan: z
    .object({
      goal: z.string().describe("The goal of the plan"),
      steps: z
        .array(
          z.object({
            number: z.number().describe("The number of the step"),
            action: z.string().describe("The action of the step"),
          })
        )
        .describe("The steps of the plan"),
    })
    .describe("The plan to send to the user"),
});

// This is the hard-coded output from the StructuredOutputParser for the above schema
const format_instructions =
  'You must format your output as a JSON value that adheres to a given "JSON Schema" instance.\n\n"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.\n\nFor example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}\nwould match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.\nThus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.\n\nYour output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!\n\nHere is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:\n```json\n{"type":"object","properties":{"text":{"type":"string","description":"The AI message to send to the user without the JSON plan formatted in Markdown."},"question":{"type":"string","description":"An AI message asking the user if the plan is right for them and if they can do the steps, formatted in Markdown."},"plan":{"type":"object","properties":{"goal":{"type":"string","description":"The goal of the plan"},"steps":{"type":"array","items":{"type":"object","properties":{"number":{"type":"number","description":"The number of the step"},"action":{"type":"string","description":"The action of the step"}},"required":["number","action"],"additionalProperties":false},"description":"The steps of the plan"}},"required":["goal","steps"],"additionalProperties":false,"description":"The plan to send to the user"}},"required":["text","question","plan"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}\n```\n';

// TODO: test
function cleanUpResponse(json: string): string {
  const badPrefixIndex = json.indexOf("```json\n");
  const badSuffixIndex = json.indexOf("\n```");

  if (badPrefixIndex === -1 && badSuffixIndex === -1) {
    return json;
  } else {
    console.log("Cleaned up response");
    return badPrefixIndex === -1 && badSuffixIndex === -1
      ? json
      : json.substring(badPrefixIndex + 8, badSuffixIndex);
  }
}

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
  }

  const humanChatMessage = new HumanChatMessage(message);

  await _internals.createChatLine(supabaseClient, humanChatMessage, chat);
  messages.push(humanChatMessage);

  let aiChatMessage: AIChatMessage,
    response: AIChatMessage,
    seraResponse: SeraResponse;

  console.log("Calling OpenAI", messages);

  // Calls OpenAI
  response = await model.call(messages);

  console.log("Received response from OpenAI", response.text);

  // TODO: also detect when updating a properly formatted plan, because it will not have these markers
  if (response.text.includes("JSON:") || response.text.includes("Goal:")) {
    console.log("Plan detected in message");

    const prompt = new PromptTemplate({
      template: "Reformat the AI message.\n{format_instructions}\n{message}",
      inputVariables: ["format_instructions", "message"],
    });

    const input = await prompt.format({
      format_instructions: format_instructions,
      message: response.text,
    });
    const reformatMessage = new SystemChatMessage(input);
    console.log(
      "Calling OpenAI to reformat message into JSON",
      reformatMessage
    );

    // Calls OpenAI
    response = await model.call([reformatMessage]);
    aiChatMessage = new AIChatMessage(response.text);
    const cleanedResponse = cleanUpResponse(response.text);
    const jsonResponse = JSON.parse(cleanedResponse);
    console.log("jsonResponse after cleanup", jsonResponse);
    seraResponse = {
      ...jsonResponse,
      chat: chat,
    };
  } else {
    aiChatMessage = new AIChatMessage(response.text);
    seraResponse = {
      text: response.text,
      chat: chat,
    };
  }

  await _internals.createChatLine(supabaseClient, aiChatMessage, chat);

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
