import {
  _internals as _llmInternals,
  ModelsContext,
  SystemChatMessage,
} from "../_shared/llm.ts";
import {
PLAN_FOR_THE_WEEK_PREMISE,
TEMPLATE_FOR_PLAN_FOR_THE_WEEK_REQUEST,
  TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST,
  TEMPLATE_FOR_WEEKLY_PLAN_REQUEST,
  WEEKLY_EMAIL_PREMISE,
  WEEKLY_PLAN_PREMISE,
} from "../_shared/plan.ts";
import { WesleyRequest } from "./wesley.ts";

async function handleRequest(
  modelsContext: ModelsContext,
  wesleyRequest: WesleyRequest,
) {
  console.log("Handling request:", wesleyRequest);
  const { messages, plan } = wesleyRequest;
  const weeklyPlanRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_WEEKLY_PLAN_REQUEST,
    WEEKLY_PLAN_PREMISE,
    messages,
    JSON.stringify(plan),
  );
  console.log("Calling OpenAI to get weekly plan", weeklyPlanRequestMessage);
  const weeklyPlanRequestResponse = await _llmInternals.getChatCompletion(
    modelsContext.chat,
    [weeklyPlanRequestMessage],
  );
  const weeklyPlan = weeklyPlanRequestResponse.text;

  console.log(
    "Response from OpenAI to weekly plan request: ",
    weeklyPlan,
  );

  const firstWeek = weeklyPlan.substring(0, weeklyPlan.indexOf("Week 2"));

  const ultimateGoalMessage = new SystemChatMessage(
    `Provide a concise summary in 1 sentence of the ultimate goal of someone ` +
      `who provides the following information to a financial coach ` +
      `once money is no longer an obstacle to their goal: "${messages}". ` +
      `Describe only the goal. Do not mention financial constraints, money, ` +
      `savings, debt, assets, finances, obstacles, hurdles, struggles, or ` +
      `challenges to achieving the goal.`,
  );
  
  console.log("Calling OpenAI to get the ultimate goal", ultimateGoalMessage);
  
  const ultimateGoalResponse = await _llmInternals.getChatCompletion(
    modelsContext.chat,
    [ultimateGoalMessage],
  );

  console.log("Response from OpenAI to ultimate goal request:", ultimateGoalResponse);

  const ultimateGoal = ultimateGoalResponse.text;

  const planForTheWeekRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_PLAN_FOR_THE_WEEK_REQUEST,
    PLAN_FOR_THE_WEEK_PREMISE,
    firstWeek,
    ultimateGoal,
  );
  console.log(
    "Calling OpenAI to get the plan for the week",
    planForTheWeekRequestMessage,
  );
  const planForTheWeekRequestResponse = await _llmInternals.getChatCompletion(
    modelsContext.chat,
    [planForTheWeekRequestMessage],
  );
  const planForTheWeek = planForTheWeekRequestResponse.text;
  console.log(
    "Response from OpenAI to plan for the week request: ",
    planForTheWeek,
  );
  
  const weeklyEmailRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST,
    WEEKLY_EMAIL_PREMISE,
    planForTheWeek,
    ultimateGoal,
  );
  console.log(
    "Calling OpenAI to get the weekly email",
    weeklyEmailRequestMessage,
  );
  const weeklyEmailRequestResponse = await _llmInternals.getChatCompletion(
    modelsContext.chat,
    [weeklyEmailRequestMessage],
  );
  const weeklyEmail = weeklyEmailRequestResponse.text;
  console.log(
    "Response from OpenAI to weekly email request: ",
    weeklyEmail,
  );

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({
      from: "info@eras.fyi",
      to: "info@eras.fyi",
      subject: "Welcome to eras 🌅",
      html: weeklyEmail,
    }),
  });

  const data = await emailResponse.json();
  console.log("Response from Resend:", JSON.stringify(data, null, 2));
}

// _internals are used for testing
export const _internals = {
  handleRequest,
};
