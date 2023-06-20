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
import { StructuredOutputParser } from "langchain/output_parsers";

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
  `You are an empathetic, emotionally-aware, and imaginative AI personal finance guide. ` +
  `You are very creative and open-minded when it comes to finding financial aspects to requests. ` +
  `You have determined the persona of the user, delimited by +++ below. ` +
  `Your task is to make a plan for the user given the user persona, taking into account the messages between you and the user, delimited by """. ` +
  `The plan should be thorough, imaginative, and consist of small steps. ` +
  `The plan should not include steps the user has already taken. ` +
  `If you have already made a plan, use information in the messages to update the plan, including the numbering of the steps, if sensible. ` +
  // `If you cannot find any financial aspects in the messages, ` +
  // `respond with a plan to reduce the costs or increase the earnings from buying, selling, visiting, using, or achieving the subject of the request. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not make up an answer. ` +
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
                  "The description of the action. This should be specific, measurable, achievable, relevant, and time-bound. Max. 2 sentences."
                ),
              ideas: z.object({
                mostObvious: z
                  .string()
                  .describe(
                    "The most obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence."
                  ),
                leastObvious: z
                  .string()
                  .describe(
                    "The least obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence."
                  ),
                inventiveOrImaginative: z
                  .string()
                  .describe(
                    "The most inventive or imaginative way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence."
                  ),
                rewardingOrSustainable: z
                  .string()
                  .describe(
                    "The most rewarding or sustainable way for the user to execute this step of this plan, tailored to their goal. Do not suggest credit cards. Max. 1 sentence."
                  ),
              }),
              // .array(z.string())
              // .describe(
              //   'the most unconventional way for the user to execute this step of this plan, tailored to their goal.'
              // )
              // .max(1),
            }),
          }),
        )
        .describe("The steps of the plan")
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
// const formatInstructions =
//   'You must format your output as a JSON value that adheres to a given "JSON Schema" instance.\n\n"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.\n\nFor example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}\nwould match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.\nThus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.\n\nYour output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!\n\nHere is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:\n```json\n{"type":"object","properties":{"text":{"type":"string","description":"An AI message to send to the user about the plan, formatted in Markdown."},"question":{"type":"string","description":"An AI message asking the user if the plan is right for them and if they can do the steps, formatted in Markdown."},"plan":{"type":"object","properties":{"goal":{"type":"string","description":"The specific, measurable, achievable, relevant, and time-bound goal of the plan that starts with a verb."},"steps":{"type":"array","items":{"type":"object","properties":{"number":{"type":"number","description":"The number of the step."},"action":{"type":"object","properties":{"name":{"type":"string","description":"The name of the action."},"description":{"type":"string","description":"The description of the action. This should be specific, measurable, achievable, relevant, and time-bound."}},"required":["name","description"],"additionalProperties":false}},"required":["number","action"],"additionalProperties":false},"description":"The steps of the plan"}},"required":["goal","steps"],"additionalProperties":false,"description":"An action plan to manage the financial aspects of a user request."}},"required":["text","question","plan"],"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}\n```\n';
// const format_instructions =
//   `You must format your output as a JSON value that adheres to a given "JSON Schema" instance.\n\n"JSON Schema" is a ` +
//   `declarative language that allows you to annotate and validate JSON documents.\n\nFor example, the example ` +
//   `"JSON Schema" instance { { "properties": { { "foo": { { "description": "a list of test words", "type": ` +
//   `"array", "items": { { "type": "string" } } } } } }, "required": ["foo"] } }}}\nwould match an object with ` +
//   `one required property, "foo".The "type" property specifies "foo" must be an "array", and the "description" ` +
//   `property semantically describes it as "a list of test words".The items within "foo" must be strings.\nThus, ` +
//   `the object { { "foo": ["bar", "baz"] } } is a well - formatted instance of this example "JSON Schema". ` +
//   `The object { { "properties": { { "foo": ["bar", "baz"] } } } } is not well - formatted.\n\nYour output will ` +
//   `be parsed and type - checked according to the provided schema instance, so make sure all fields in your output ` +
//   `match the schema exactly and there are no trailing commas!\n\nHere is the JSON Schema instance your output must ` +
//   `adhere to.Include the enclosing markdown codeblock: \n\`\`\`json\n{"type":"object","properties":{"text":{"type":` +
//   `"string","description": "An AI message to send to the user about the plan, formatted in Markdown."}, "question": ` +
//   `{ "type": "string", "description": "An AI message asking the user if the plan is right for them and if they can ` +
//   `do the steps, formatted in Markdown" }, "plan": { "type": "object", "properties": { "goal": { "type": "string", ` +
//   `"description": "The specific, measurable, achievable, relevant, and time - bound goal of the plan that starts ` +
//   `with a verb" }, "steps": { "type": "array", "items": { "type": "object", "properties": { "number": { "type": ` +
//   `"number", "description": "The number of the step" }, "action": { "type": "string", "description": "The description ` +
//   `of the step. This should be specific, measurable, achievable, relevant, and time-bound." } }, "required": ` +
//   `["number", "action"], "additionalProperties": false }, "description": "The steps of the plan" } }, "required": ` +
//   `["goal", "steps"], "additionalProperties": false, "description": "An action plan to manage the financial aspects ` +
//   `of a user request." }}, "required": ["text", "question", "plan"], "additionalProperties": false, "$schema": ` +
//   `"http://json-schema.org/draft-07/schema#"}\n\`\`\`\n`;

function convertToSeraResponse(response: string, chat: number): SeraResponse {
  let responseJson;

  const openingBraceIndex = response.indexOf("{");
  const closingBraceIndex = response.lastIndexOf("}");
  if (openingBraceIndex === -1 || closingBraceIndex === -1) {
    responseJson = {
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

    responseJson = JSON.parse(potentialJson);
    if (Object.keys(responseJson.plan).length === 0) {
      delete responseJson.plan;
    }
  }

  const seraResponse = {
    ...responseJson,
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

  // Get user persona
  const userPersonaPromptTemplate = new PromptTemplate({
    template:
      '{user_persona_prompt_premise}\nSearch terms:\n"""{search_terms}"""',
    inputVariables: ["user_persona_prompt_premise", "search_terms"],
  });
  // TODO: add that they are interested in online learning
  const userPersonaPromptPremise =
    `You are an empathetic AI personal finance guide that helps users improve their budgeting, saving, and other ` +
    `financial literacy skills. ` +
    `You believe there are financial goals related to every aspect of life. ` +
    `Describe the most likely goals and personality of someone who inputs the search terms delimited by """ below. ` +
    `Unless you know otherwise, assume the person is also concerned ` +
    `with inflation, has very little savings, has very little experience budgeting, is open to ` +
    `new or additional jobs, is open to online learning, and wants to reduce the costs or increase the earnings from buying, selling, ` +
    `visiting, using, or achieving the search terms. Your response should be one paragraph.`;
  const searchTerms = messages
    .filter((m) => m._getType() === "human")
    .map((m) => m.text)
    .join(", ");
  const userPersonaPrompt = await userPersonaPromptTemplate.format({
    user_persona_prompt_premise: userPersonaPromptPremise,
    search_terms: searchTerms,
  });
  const userPersonaMessage = new SystemChatMessage(userPersonaPrompt);
  console.log("Calling OpenAI to get user persona", userPersonaMessage);
  const userPersonaResponse = await model.call([userPersonaMessage]);
  const userPersonaResponseText = userPersonaResponse.text;
  console.log("Got user persona response: ", userPersonaResponseText);

  const prompt = new PromptTemplate({
    template:
      '{premise}\n{format_instructions}\nUser Persona:\n+++\n{user_persona}\n+++\nMessages:\n"""\n{messages}\n"""',
    inputVariables: [
      "premise",
      "format_instructions",
      "user_persona",
      "messages",
    ],
  });

  const parser = StructuredOutputParser.fromZodSchema(_responseWithJsonSchema);
  const formatInstructions = parser.getFormatInstructions();
  const mappedMessages = messages.map((m) => m._getType() + ": " + m.text);
  const input = await prompt.format({
    premise: premise,
    format_instructions: formatInstructions,
    user_persona: userPersonaResponseText,
    messages: mappedMessages.join("\n"),
  });
  const planRequestMessage = new SystemChatMessage(input);

  console.log("Calling OpenAI to get plan", planRequestMessage);

  // Calls OpenAI
  const response = await model.call([planRequestMessage]);
  const aiChatMessage = new AIChatMessage(response.text);
  const seraResponse = convertToSeraResponse(aiChatMessage.text, chat);

  // // Merge list of activities into plan
  // if (seraResponse.plan) {
  //   const listOfActivitiesPromptTemplate = new PromptTemplate({
  //     template:
  //       '{list_of_activities_premise}\nUser Persona:\n+++\n{user_persona}\n+++\nGoal:\n"""\n{goal}\n"""',
  //     inputVariables: ["list_of_activities_premise", "user_persona", "goal"],
  //   });
  //   const listOfActivitiesPremise = `Provide a list of the 5 most unconventional ways for a user who has the user persona delimited by """ below to achieve their goals.\n`;

  //   const listOfActivitiesPrompt = await listOfActivitiesPromptTemplate.format({
  //     list_of_activities_premise: listOfActivitiesPremise,
  //     user_persona: userPersonaResponseText,
  //     goal: JSON.stringify(seraResponse.plan.goal),
  //   });
  //   const listOfActivitiesMessage = new SystemChatMessage(
  //     listOfActivitiesPrompt
  //   );
  //   console.log(
  //     "Calling OpenAI to get list of activities",
  //     listOfActivitiesMessage
  //   );
  //   const listOfActivitiesResponse = await model.call([
  //     listOfActivitiesMessage,
  //   ]);
  //   const listOfActivitiesResponseText = listOfActivitiesResponse.text;
  //   console.log(
  //     "Got list of activities response:",
  //     listOfActivitiesResponseText
  //   );

  //   // const mergePromptTemplate = new PromptTemplate({
  //   //   template:
  //   //     '{merge_premise}\n{format_instructions}\n---\n{list_of_activities}\n---\n"""\n{message}\n"""',
  //   //   inputVariables: [
  //   //     "merge_premise",
  //   //     "format_instructions",
  //   //     "list_of_activities",
  //   //     "message",
  //   //   ],
  //   // });
  //   // const mergePremise = `Incorporate the list of ideas delimited by +++ below into the plan in the message delimited by """ below.`;
  //   // const mergePrompt = await mergePromptTemplate.format({
  //   //   merge_premise: mergePremise,
  //   //   format_instructions: formatInstructions,
  //   //   list_of_activities: listOfActivitiesResponseText,
  //   //   message: JSON.stringify(seraResponse),
  //   // });
  //   // const mergeMessage = new SystemChatMessage(mergePrompt);
  //   // console.log(
  //   //   "Calling OpenAI to merge list of activities into plan",
  //   //   mergeMessage
  //   // );
  //   // const mergeResponse = await model.call([mergeMessage]);
  //   // const mergeStrippedResponse = stripAIPrefixFromResponse(mergeResponse.text);
  //   // const mergePreambleStrippedResponse = stripPreambleFromResponse(
  //   //   mergeStrippedResponse
  //   // );
  //   // const mergeCleanedResponse = cleanResponse(mergePreambleStrippedResponse);
  //   // const mergeResponseJson = JSON.parse(mergeCleanedResponse);
  //   // console.log("mergeResponseJson after cleanup", mergeResponseJson);
  // }

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
