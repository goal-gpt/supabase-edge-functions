import {
  AIChatMessage,
  BaseChatMessage,
  FunctionChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase.ts";
import {
  ChatCompletionRequestMessageFunctionCall,
} from "../../types/openai.ts";
import { SeraRequest } from "./sera.ts";
import {
  Action,
  getChatCompletion,
  getEmbeddingString,
  GetPlanJson,
  getPlanSchema,
  getPredictedFunctionInputs,
  getSystemMessage,
  ModelsContext,
  Plan,
  truncateDocuments,
} from "../_shared/llm.ts";
import { MatchDocumentsResponse } from "../_shared/supabaseClient.ts";
import { OpenAIEmbeddings } from "../_shared/llm.ts";
import { getSimilarDocuments } from "../_shared/supabaseClient.ts";

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
        case "function":
          // TODO: implement something here but, for now, we don't want to return multiple function messages
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
}

async function createChat(
  supabaseClient: SupabaseClient<Database>,
): Promise<number> {
  console.log("Creating chat");
  const { data, error } = await supabaseClient.from("chat").insert({}).select();
  if (error) throw error;

  const chat = data[0].id;

  return chat;
}

export interface BaseSeraResponse {
  text: string;
  links?: string[];
  plan?: Plan;
}

export interface SeraResponse extends BaseSeraResponse {
  chat: number;
}

export const premise =
  `You are an empathetic, emotionally-aware, and imaginative AI personal finance guide. ` +
  `You are very creative and open-minded when it comes to finding financial aspects to requests. ` +
  `Make use of context_documents, delimited by ###, to add information and links into the answers you provide whenever possible. ` +
  `Quotations from context_documents should be used to substantiate your claims as long as they are cited. ` +
  `Here is an example citation: Individuals should establish a household budget to understand their cash flow (Source: [Household budgeting](https://www.bogleheads.org/wiki/Household_budgeting)). ` +
  `Your task is to make a plan for the user that helps them resolve their financial concerns or achieve their financial goals, ` +
  `based on the messages between you and the user, delimited by """. ` +
  `If you cannot determine the user's financial concerns or goals based on the messages, ` +
  `respond with a plan to reduce the costs or increase the earnings from buying, selling, visiting, using, or achieving the subject of the user's messages. ` +
  `Unless you know otherwise, assume the user is also concerned ` +
  `with inflation, has very little savings, has very little experience budgeting, is open to ` +
  `new or additional jobs, and is open to online learning.` +
  `The plan should be thorough, imaginative, and consist of small steps. Add sources from context_documents where possible. ` +
  `The plan should not include steps the user has already taken. ` +
  `If you have already made a plan, use information in the messages to update the plan, including the numbering of the steps, if sensible. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not make up an answer. ` +
  `Never say that you are providing "advice".`;

async function embedAndGetSimilarDocuments(
  model: OpenAIEmbeddings,
  supabaseClient: SupabaseClient<Database>,
  messages: BaseChatMessage[],
): Promise<MatchDocumentsResponse> {
  const lastMessages = messages.slice(-5).map((v) => v.text).join(" ");
  const embeddingString = await getEmbeddingString(model, lastMessages);
  const documents = await getSimilarDocuments(
    supabaseClient,
    embeddingString,
    0.78,
    10,
  );
  return documents;
}

export async function handleRequest(
  modelsContext: ModelsContext,
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

  const rawDocuments = await embedAndGetSimilarDocuments(
    modelsContext.embed,
    supabaseClient,
    messages,
  );
  const { links, text: contextDocuments } = truncateDocuments(rawDocuments);

  const planRequestMessage = await getSystemMessage(
    premise,
    contextDocuments,
    messages,
  );

  console.log("Calling OpenAI to get plan", planRequestMessage);

  // Get predicted inputs to make a plan
  const planResponse = await getPredictedFunctionInputs(
    modelsContext.chat,
    [planRequestMessage],
    [getPlanSchema],
    "get_plan",
  );

  // Clean up the JSON response from OpenAI
  const cleanResponse = cleanPlanResponse(planResponse);
  const planResponseJson: GetPlanJson = JSON.parse(cleanResponse);

  // Embed links in the plan actions
  const linksInActionJson = await addLinksToAction(
    modelsContext,
    supabaseClient,
    planResponseJson,
  );

  const planMessage = new FunctionChatMessage(
    JSON.stringify(linksInActionJson, null, 2),
    planResponse.name || "",
  );

  messages.push(planMessage);
  await _internals.createChatLine(supabaseClient, planMessage, chat);

  // Prepare the SeraResponse
  const response: SeraResponse = { chat, text: planResponseJson.text };
  if (Object.keys(planResponseJson).length > 0) {
    response.plan = planResponseJson;
  }
  if (links) response.links = links;
  console.log("Response: ", response);
  return response;
}

const actionPremise =
  `You are an empathetic, emotionally-aware, and imaginative AI personal finance guide. ` +
  `Combine the action description, delimited by """, with the links in the context so that users can learn more about the action by clicking on the links, where they are relevant, in the description. ` +
  `Links are delimited by ###. The format is [title](url). These are real links. Do not make up links. `;

async function addLinksToAction(
  modelsContext: ModelsContext,
  supabaseClient: SupabaseClient<Database>,
  planResponseJson: GetPlanJson,
): Promise<GetPlanJson> {
  const newPlanResponseJson: GetPlanJson = { ...planResponseJson };
  const { steps } = planResponseJson;
  for (let i = 0; i < steps.length; i++) {
    const { action } = steps[i];
    const { description, ideas, name } = action;
    const newIdeas = { ...ideas };
    const newAction = {} as Action;

    // Call OpenAI in parallel to add links to the ideas
    // const promises: Promise<string[]>[] = Object.entries(ideas)
    //   .filter(([, value]) => value)
    //   .map(async ([key, value]) => {
    //     const response = await addLinksToText(
    //       modelsContext,
    //       supabaseClient,
    //       value,
    //     );
    //     return [key, response.text];
    //   });

    // Add the last promise for the description
    const promises = [(async () => {
      const response = await addLinksToText(
        modelsContext,
        supabaseClient,
        description,
      );
      return ["description", response.text];
    })()];
    const results = await Promise.all(promises);

    for (const [key, text] of results) {
      if (key === "description") {
        newAction.description = text;
      } else {
        newIdeas[key as keyof typeof ideas] = text;
      }
    }

    newAction.ideas = newIdeas;
    newAction.name = name;
    newPlanResponseJson.steps[i].action = newAction;
  }

  console.log("New plan response: ", newPlanResponseJson);

  return newPlanResponseJson;
}

async function addLinksToText(
  modelsContext: ModelsContext,
  supabaseClient: SupabaseClient<Database>,
  value: string,
): Promise<SystemChatMessage> {
  const documents = await embedAndGetSimilarDocuments(
    modelsContext.embed,
    supabaseClient,
    [new SystemChatMessage(value)],
  );
  const { text: contextDocuments } = truncateDocuments(documents);
  const systemMessage = await getSystemMessage(
    actionPremise,
    contextDocuments,
    [new SystemChatMessage(value)],
  );
  return await getChatCompletion(
    modelsContext.chat,
    [systemMessage],
  );
}

function cleanPlanResponse(
  planResponse: ChatCompletionRequestMessageFunctionCall,
): string {
  const regex = /\,(?=\s*?[\}\]])/g;
  return planResponse.arguments?.replace(regex, "") || "{}";
}

// _internals are used for testing
export const _internals = {
  handleRequest,
  createChat,
  createChatLine,
  getAllChatLines,
  updateChatLineMessage,
};
