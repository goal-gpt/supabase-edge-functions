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
import { z, ZodTypeAny } from "zod";
import { PromptTemplate } from "langchain/prompts";

async function getAllChatLines(
  supabaseClient: SupabaseClient<Database>,
  chat: number,
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
  chat?: number,
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
  supabaseClient: SupabaseClient<Database>,
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
  action: string; // TODO: convert to {name: string, description: string}? Although it doesn't appear used beyond this file
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

export const premise =
  `You are an empathetic, emotionally-aware, and imaginative AI personal finance guid. ` +
  `You are very creative and open-minded when it comes to finding financial aspects to requests. ` +
  `Given messages between you and the user, delimited by """, try to respond with a thorough and imaginative plan that consists of small steps. ` +
  `If you have already made a plan, use information in the messages to update the plan, including the numbering of the steps, if sensible. ` +
  `If you cannot find any financial aspects to a request, ` +
  `try to respond with a plan to reduce the costs or increase the earnings from buying, selling, visiting, using, or achieving the subject of the request. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not try to make up an answer. ` +
  `Never say that you are providing "advice".`;

// TODO: this results in a type error when used with the StructuredOutputParser: "TS2589 [ERROR]: Type instantiation is excessively deep and possibly infinite."
//       For now, I've hard-coded the output as a template literal, "format_instructions", for the prompt
// underscore prefix is to tell Deno lint to ignore this unused variable
const _responseWithJsonSchema: ZodTypeAny = z.object({
  text: z
    .string()
    .describe(
      "An AI message to send to the user about the plan, formatted in Markdown.",
    ),
  question: z
    .string()
    .describe(
      "An AI message asking the user if the plan is right for them and if they can do the steps, formatted in Markdown.",
    ),
  plan: z
    .object({
      goal: z
        .string()
        .describe(
          "The specific, measurable, achievable, relevant, and time-bound goal of the plan that starts with a verb.",
        ),
      steps: z
        .array(
          z.object({
            number: z.number().describe("The number of the step."),
            action: z.object({
              name: z.string().describe("The name of the action."),
              description: z
                .string()
                .describe(
                  "The description of the action. This should be specific, measurable, achievable, relevant, and time-bound.",
                ),
            }),
          }),
        )
        .describe("The steps of the plan"),
    })
    .describe(
      "An action plan to manage the financial aspects of a user request.",
    ),
});

// This is the hard-coded output from the StructuredOutputParser for the above schema
// It is long and it would be easier to read it if it were formatted as a template literal, but that would make it harder to update
// TODO: refactor to use variables for _responseWithJsonSchema and format_instructions so that
//       they remain in sync
const formatInstructions =
  'You must format your output as a JSON value that adheres to a given "JSON Schema" instance.\n\n"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.\n\nFor example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}\nwould match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.\nThus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.\n\nYour output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!\n\nHere is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:\n```json\n{"type":"object","properties":{"text":{"type":"string","description":"An AI message to send to the user about the plan, formatted in Markdown."},"question":{"type":"string","description":"An AI message asking the user if the plan is right for them and if they can do the steps, formatted in Markdown."},"plan":{"type":"object","properties":{"goal":{"type":"string","description":"The specific, measurable, achievable, relevant, and time-bound goal of the plan that starts with a verb."},"steps":{"type":"array","items":{"type":"object","properties":{"number":{"type":"number","description":"The number of the step."},"action":{"type":"object","properties":{"name":{"type":"string","description":"The name of the action."},"description":{"type":"string","description":"The description of the action. This should be specific, measurable, achievable, relevant, and time-bound."}},"required":["name","description"],"additionalProperties":false}},"required":["number","action"],"additionalProperties":false},"description":"The steps of the plan"}},"required":["goal","steps"],"additionalProperties":false,"description":"An action plan to manage the financial aspects of a user request."}},"required":["text","question","plan"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}\n```\n';

// TODO: test
function stripAIPrefixFromResponse(response: string): string {
  const aiPrefixIndex = response.search(/ai:/i);
  if (aiPrefixIndex === 0) {
    const aiStrippedResponse = response.substring(4);

    console.log("Stripped AI prefix:", aiStrippedResponse);
    return aiStrippedResponse;
  } else {
    return response;
  }
}

// TODO: test
function stripPreambleFromResponse(response: string): string {
  const jsonStartIndex = response.indexOf("\n\n{\n");

  if (jsonStartIndex === -1) {
    return response;
  } else {
    const preambleStrippedResponse = response.substring(jsonStartIndex);
    console.log("Stripped preamble:", preambleStrippedResponse);

    return preambleStrippedResponse;
  }
}

// TODO: test
function cleanResponse(response: string): string {
  const badPrefixIndex = response.indexOf("```json\n");
  const badSuffixIndex = response.indexOf("\n```");

  if (badPrefixIndex === -1 && badSuffixIndex === -1) {
    return response;
  } else {
    const cleanedResponse = badPrefixIndex === -1 && badSuffixIndex === -1
      ? response
      : response.substring(badPrefixIndex + 8, badSuffixIndex);

    console.log("Cleaned response:", cleanedResponse);
    return cleanedResponse;
  }
}

// TODO: test
function convertToSeraResponse(response: string, chat: number): SeraResponse {
  let responseJson;

  try {
    responseJson = JSON.parse(response);
  } catch (_e) {
    responseJson = {
      text: response,
    };
  }

  const seraResponse = {
    ...responseJson,
    chat: chat,
  };

  console.log("Converted to seraResponse:", JSON.stringify(seraResponse));

  return seraResponse;
}

export async function handleRequest(
  model: ChatOpenAI,
  supabaseClient: SupabaseClient<Database>,
  request: SeraRequest,
): Promise<SeraResponse> {
  const messages: BaseChatMessage[] = [];
  const message = request.message;
  let chat = request.chat;

  if (chat) {
    // TODO: Consider replacing with database function or call to database REST API
    messages.push(...(await _internals.getAllChatLines(supabaseClient, chat)));
  } else {
    chat = await _internals.createChat(supabaseClient);
  }

  const humanChatMessage = new HumanChatMessage(message);

  messages.push(humanChatMessage);
  await _internals.createChatLine(supabaseClient, humanChatMessage, chat);

  const prompt = new PromptTemplate({
    template: '{premise}\n{format_instructions}\n"""{messages}"""',
    inputVariables: ["premise", "format_instructions", "messages"],
  });

  const mappedMessages = messages.map((m) => m._getType() + ": " + m.text);
  const input = await prompt.format({
    premise: premise,
    format_instructions: formatInstructions,
    messages: mappedMessages.join("\n"),
  });
  const planRequestMessage = new SystemChatMessage(input);

  console.log("Calling OpenAI to get plan", planRequestMessage);

  // Calls OpenAI
  const response = await model.call([planRequestMessage]);
  const aiChatMessage = new AIChatMessage(response.text);
  const aiStrippedResponse = stripAIPrefixFromResponse(response.text);
  const preambleStrippedResponse = stripPreambleFromResponse(
    aiStrippedResponse,
  );
  const cleanedResponse = cleanResponse(preambleStrippedResponse);
  const seraResponse = convertToSeraResponse(cleanedResponse, chat);

  await _internals.createChatLine(supabaseClient, aiChatMessage, chat);

  console.log("Returning processed response from LLM:", seraResponse);
  return seraResponse;
}

// _internals are used for testing
export const _internals = {
  handleRequest,
  createChat,
  createChatLine,
  getAllChatLines,
};
