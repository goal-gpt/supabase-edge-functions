import { Database } from "../../types/supabase.ts";
import { SeraRequest, SeraResponse } from "./sera.ts";
import {
  _internals as _llmInternals,
  BaseChatMessage,
  FunctionChatMessage,
  HumanChatMessage,
  ModelsContext,
  SystemChatMessage,
} from "../_shared/llm.ts";
import {
  ACTION_PREMISE,
  GetPlanJson,
  Plan,
  PLAN_PREMISE,
  PLAN_SCHEMA,
  PLAN_SCHEMA_NAME,
  TEMPLATE_FOR_ACTION_REQUEST,
  TEMPLATE_FOR_PLAN_REQUEST,
} from "../_shared/plan.ts";
import {
  _internals as _supabaseClientInternals,
  SupabaseClient,
} from "../_shared/supabaseClient.ts";

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
    messages.push(
      ...(await _supabaseClientInternals.getAllChatLines(supabaseClient, chat)),
    );
  } else {
    chat = await _supabaseClientInternals.createChat(supabaseClient);
  }

  const humanChatMessage = new HumanChatMessage(message);

  messages.push(humanChatMessage);
  await _supabaseClientInternals.createChatLine(
    supabaseClient,
    humanChatMessage,
    chat,
  );

  const lastMessages = messages.slice(-5).map((v) => v.text).join(" ");
  const rawDocuments = await _llmInternals.embedAndGetSimilarDocuments(
    modelsContext.embed,
    supabaseClient,
    lastMessages,
  );

  const { text: contextDocuments } = _llmInternals
    .truncateDocuments(
      rawDocuments,
    );

  const systemMessageMessages = _llmInternals.getMessagesForSystemMessage(
    messages,
  );
  const planRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_PLAN_REQUEST,
    PLAN_PREMISE,
    contextDocuments,
    systemMessageMessages,
  );

  console.log("Calling OpenAI to get plan", planRequestMessage);

  // Get predicted inputs to make a plan
  const planResponse = await _llmInternals.getPredictedFunctionInputs(
    modelsContext.chat,
    [planRequestMessage],
    [PLAN_SCHEMA],
    PLAN_SCHEMA_NAME,
  );

  // Clean up the JSON response from OpenAI
  const planResponseJson: GetPlanJson = _llmInternals.cleanJsonResponse(
    planResponse,
  );

  const planMessage = new FunctionChatMessage(
    JSON.stringify(planResponseJson, null, 2),
    planResponse.name || "",
  );

  messages.push(planMessage);
  await _supabaseClientInternals.createChatLine(
    supabaseClient,
    planMessage,
    chat,
  );
  // Prepare the SeraResponse
  const response: SeraResponse = { chat, text: planResponseJson.text || "" };
  if (Object.keys(planResponseJson).length > 0) {
    const { text: _text, ...rest } = planResponseJson;
    response.plan = { ...rest };
  }

  // Send the plan to Wesley to break down and email to the user
  if (response.plan) sendPlanToWesley(supabaseClient, messages, response.plan);

  console.log("Response: ", JSON.stringify(response, null, 2));
  return response;
}

// TODO: determine if this is needed
async function addLinksToActions(
  modelsContext: ModelsContext,
  supabaseClient: SupabaseClient<Database>,
  planResponseJson: GetPlanJson,
): Promise<GetPlanJson> {
  const newPlanResponseJson: GetPlanJson = { ...planResponseJson };
  const { steps } = planResponseJson;
  const promises = [] as Promise<[number, string]>[];

  // Add promises for description
  for (let i = 0; i < steps.length; i++) {
    const { action } = steps[i];
    const { description } = action;
    promises.push(
      (async () => {
        const response = await _internals.addLinksToText(
          modelsContext,
          supabaseClient,
          description,
        );
        return [i, response.text];
      })(),
    );
  }

  const results = await Promise.all(promises);
  for (const [key, text] of results) {
    console.log("key: ", key, "new description: ", text);
    newPlanResponseJson.steps[key].action.description = text;
  }

  return newPlanResponseJson;
}

async function addLinksToText(
  modelsContext: ModelsContext,
  supabaseClient: SupabaseClient<Database>,
  value: string,
): Promise<SystemChatMessage> {
  const documents = await _llmInternals.embedAndGetSimilarDocuments(
    modelsContext.embed,
    supabaseClient,
    value,
  );
  const { text: contextDocuments } = _llmInternals.truncateDocuments(documents);
  const systemMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_ACTION_REQUEST,
    ACTION_PREMISE,
    contextDocuments,
    value,
  );
  return await _llmInternals.getChatCompletion(
    modelsContext.chat,
    [systemMessage],
  );
}

function sendPlanToWesley(
  supabaseClient: SupabaseClient<Database>,
  baseChatMessages: BaseChatMessage[],
  plan: Plan,
) {
  console.log("Sending plan to Wesley");
  const messages = baseChatMessages.map((v) => v.text).join("; ");

  supabaseClient.functions.invoke("wesley", {
    body: JSON.stringify({ messages: messages, plan: plan }),
  });
}

// _internals are used for testing
export const _internals = {
  addLinksToActions,
  addLinksToText,
  handleRequest,
};
