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
  chat: number,
): Promise<number> {
  console.log("Creating chat line", message.text, chat);

  const { data, error } = await supabaseClient
    .from("chat_line")
    .insert({ chat: chat, message: message.text, sender: message._getType() })
    .select();

  if (error) throw error;

  const chatLine = data[0].id;

  console.log("Created chatLine", chatLine);

  return chatLine;
}

async function updateChatLineMessage(
  supabaseClient: SupabaseClient<Database>,
  chatLine: number,
  messageText: string,
) {
  console.log("Updating chat line", chatLine, messageText);

  const { error } = await supabaseClient
    .from("chat_line")
    .update({ message: messageText })
    .eq("id", chatLine)
    .select();

  if (error) throw error;
  console.log("Updated chat line", chatLine);
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

export interface Action {
  name: string;
  description: string;
  ideas?: {
    mostObvious?: string;
    leastObvious?: string;
    inventiveOrImaginative?: string;
    rewardingOrSustainable?: string;
  };
}

export interface Step {
  number: number;
  action: Action; // TODO: convert to {name: string, description: string}? Although it doesn't appear used beyond this file
}

export interface Plan {
  goal: string;
  steps: Step[];
}
export interface BaseSeraResponse {
  text: string;
  plan?: Plan;
}

export interface SeraResponse extends BaseSeraResponse {
  chat: number;
}

export const premise =
  `You are an empathetic, emotionally-aware, and imaginative AI personal finance guide. ` +
  `You are very creative and open-minded when it comes to finding financial aspects to requests. ` +
  `Your task is to make a plan for the user that helps them resolve their financial concerns or achieve their financial goals, ` +
  `based on the messages between you and the user, delimited by """. ` +
  `If you cannot determine the user's financial concerns or goals based on the messages, ` +
  `respond with a plan to reduce the costs or increase the earnings from buying, selling, visiting, using, or achieving the subject of the user's messages. ` +
  `Unless you know otherwise, assume the user is also concerned ` +
  `with inflation, has very little savings, has very little experience budgeting, is open to ` +
  `new or additional jobs, and is open to online learning.` +
  `The plan should be thorough, imaginative, and consist of small steps. ` +
  `The plan should not include steps the user has already taken. ` +
  `If you have already made a plan, use information in the messages to update the plan, including the numbering of the steps, if sensible. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not make up an answer. ` +
  `Never say that you are providing "advice".`;

// TODO: this results in a type error when used with the StructuredOutputParser: "TS2589 [ERROR]: Type instantiation is excessively deep and possibly infinite."
//       For now, I've hard-coded the output as a template literal, "format_instructions", for the prompt
// underscore prefix is to tell Deno lint to ignore this unused variable
const _formatInstructions: ZodTypeAny = z.object({
  text: z
    .string()
    .describe(
      "An AI message to send to the user about the plan, formatted in Markdown.",
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
                  "An AI message to the user that describes the action and how it helps achieve the goal. This should be specific, measurable, achievable, relevant, and time-bound. Max. 2 sentences.",
                ),
              ideas: z.object({
                mostObvious: z
                  .string()
                  .describe(
                    "An AI message to the user that describes the most obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence.",
                  ),
                leastObvious: z
                  .string()
                  .describe(
                    "An AI message to the user that describes the least obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence.",
                  ),
                inventiveOrImaginative: z
                  .string()
                  .describe(
                    "An AI message to the user that describes the most inventive or imaginative way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence.",
                  ),
                rewardingOrSustainable: z
                  .string()
                  .describe(
                    "An AI message to the user that describes the most rewarding or sustainable way for the user to execute this step of this plan, tailored to their goal. Do not suggest credit cards. Max. 1 sentence.",
                  ),
              }),
            }),
          }),
        )
        .describe("The steps of the plan")
        .min(3)
        .max(5),
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
  'You must format your output as a JSON value that adheres to a given "JSON Schema" instance.\n\n"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.\n\nFor example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}\nwould match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.\nThus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.\n\nYour output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!\n\nHere is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:\n```json\n{"type":"object","properties":{"text":{"type":"string","description":"An AI message to send to the user about the plan, formatted in Markdown."},"plan":{"type":"object","properties":{"goal":{"type":"string","description":"The specific, measurable, achievable, relevant, and time-bound goal of the plan that starts with a verb."},"steps":{"type":"array","items":{"type":"object","properties":{"number":{"type":"number","description":"The number of the step."},"action":{"type":"object","properties":{"name":{"type":"string","description":"The name of the action."},"description":{"type":"string","description":"An AI message to the user that describes the action and how it helps achieve the goal. This should be specific, measurable, achievable, relevant, and time-bound. Max. 2 sentences."},"ideas":{"type":"object","properties":{"mostObvious":{"type":"string","description":"An AI message to the user that describes the most obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence."},"leastObvious":{"type":"string","description":"An AI message to the user that describes the least obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence."},"inventiveOrImaginative":{"type":"string","description":"An AI message to the user that describes the most inventive or imaginative way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence."},"rewardingOrSustainable":{"type":"string","description":"An AI message to the user that describes the most rewarding or sustainable way for the user to execute this step of this plan, tailored to their goal. Do not suggest credit cards. Max. 1 sentence."}},"required":["mostObvious","leastObvious","inventiveOrImaginative","rewardingOrSustainable"],"additionalProperties":false}},"required":["name","description","ideas"],"additionalProperties":false}},"required":["number","action"],"additionalProperties":false},"minItems":3,"maxItems":5,"description":"The steps of the plan"}},"required":["goal","steps"],"additionalProperties":false,"description":"An action plan to manage the financial aspects of a user request."}},"required":["text","plan"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}\n```\n';
function convertToBaseSeraResponse(response: string): BaseSeraResponse {
  let baseSeraResponse: BaseSeraResponse;
  const openingBraceIndex = response.indexOf("{");
  const closingBraceIndex = response.lastIndexOf("}");

  if (openingBraceIndex === -1 || closingBraceIndex === -1) {
    baseSeraResponse = {
      text: response,
    };
  } else {
    console.log("Extracting JSON from response");
    let potentialJson = response.substring(
      openingBraceIndex,
      closingBraceIndex + 1,
    );
    const responseKeys = [
      "text",
      "question",
      "plan",
      "goal",
      "steps",
      "number",
      "action",
      "name",
      "description",
    ];

    console.log("Adding quotes to keys where missing");
    responseKeys.forEach((key) => {
      let reformattedJson = potentialJson;

      const trickyKey = `${key}:"`;
      const trickyKeyTemporarySub = `---${trickyKey.slice(0, -2)}---${
        trickyKey.slice(-2)
      }`;
      reformattedJson = reformattedJson.replaceAll(
        trickyKey,
        trickyKeyTemporarySub,
      );
      reformattedJson = reformattedJson.replaceAll(`${key}:`, `"${key}":`);
      reformattedJson = reformattedJson.replaceAll(
        trickyKeyTemporarySub,
        trickyKey,
      );

      if (reformattedJson !== potentialJson) {
        console.log(`Added quotes to "${key}" key`);
      }

      potentialJson = reformattedJson;
    });

    console.log("Potential JSON:", potentialJson);

    baseSeraResponse = JSON.parse(potentialJson);
  }

  console.log("Converted to baseSeraResponse:", baseSeraResponse);
  return baseSeraResponse;
}

function convertToSeraResponse(response: string, chat: number): SeraResponse {
  const baseSeraResponse = convertToBaseSeraResponse(response);

  if (
    baseSeraResponse.plan && Object.keys(baseSeraResponse.plan).length === 0
  ) {
    console.log("Removing empty plan");
    delete baseSeraResponse.plan;
  }

  const seraResponse = {
    ...baseSeraResponse,
    chat: chat,
  };

  console.log("Converted to seraResponse:", seraResponse);

  return seraResponse;
}

export async function handleRequest(
  model: ChatOpenAI,
  supabaseClient: SupabaseClient<Database>,
  request: SeraRequest,
): Promise<SeraResponse> {
  console.log("Handling request");

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
    template:
      '{premise}\n{format_instructions}\n+++\nMessages:\n"""\n{messages}\n"""',
    inputVariables: [
      "premise",
      "format_instructions",
      "messages",
    ],
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
  const aiChatLine = await _internals.createChatLine(
    supabaseClient,
    aiChatMessage,
    chat,
  );
  const seraResponse = convertToSeraResponse(aiChatMessage.text, chat);

  // Update chat line with processed response
  const processedResponse = JSON.stringify(seraResponse);

  await _internals.updateChatLineMessage(
    supabaseClient,
    aiChatLine,
    processedResponse,
  );

  console.log("Returning processed response from LLM:", seraResponse);

  return seraResponse;
}

// _internals are used for testing
export const _internals = {
  handleRequest,
  createChat,
  createChatLine,
  getAllChatLines,
  updateChatLineMessage,
};
