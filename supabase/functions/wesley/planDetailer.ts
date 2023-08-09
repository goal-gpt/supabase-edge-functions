import { _internals as _llmInternals, ModelsContext } from "../_shared/llm.ts";
import {
  TEMPLATE_FOR_WEEKLY_PLAN_REQUEST,
  WEEKLY_PLAN_PREMISE,
} from "../_shared/plan.ts";
import { WesleyRequest } from "./wesley.ts";

async function handleRequest(
  modelsContext: ModelsContext,
  wesleyRequest: WesleyRequest,
) {
  const { messages: baseChatMessages, plan } = wesleyRequest;
  const messages = baseChatMessages.map((v) => v.text).join(" ");
  const weeklyPlanRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_WEEKLY_PLAN_REQUEST,
    WEEKLY_PLAN_PREMISE,
    messages,
    JSON.stringify(plan),
  );
  console.log("Calling OpenAI to get weekly plan", weeklyPlanRequestMessage);
  const response = await _llmInternals.getChatCompletion(
    modelsContext.chat,
    [weeklyPlanRequestMessage],
  );

  console.log("Response from OpenAI to weekly plan request: ", JSON.stringify(response, null, 2));
}

// _internals are used for testing
export const _internals = {
  handleRequest,
};
