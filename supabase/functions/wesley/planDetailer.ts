import {
  _internals as _llmInternals,
  ModelsContext,
  OpenAIEmbeddings,
  SystemChatMessage,
} from "../_shared/llm.ts";
import {
  PLAN_FOR_THE_WEEK_PREMISE,
  STRIPE_PAYMENT_LINK,
  TEMPLATE_FOR_PLAN_FOR_THE_WEEK_REQUEST,
  TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST,
  TEMPLATE_FOR_WEEKLY_PLAN_REQUEST,
  WEEKLY_EMAIL_PREMISE,
  WEEKLY_PLAN_PREMISE,
} from "../_shared/plan.ts";
import { WesleyRequest } from "./wesley.ts";
import {
  _internals as _supabaseClientInternals,
  ContentItem,
  SupabaseClient,
} from "../_shared/supabaseClient.ts";
import { Database } from "../../types/supabase.ts";

async function handleRequest(
  modelsContext: ModelsContext,
  supabaseClient: SupabaseClient<Database>,
  wesleyRequest: WesleyRequest,
) {
  console.log("Handling request:", wesleyRequest);
  const { messages, plan, userName } = wesleyRequest;
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

  console.log(
    "Response from OpenAI to ultimate goal request:",
    ultimateGoalResponse,
  );

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

  const suggestedResources = await getContentItemsForPlan(
    modelsContext.embed,
    supabaseClient,
    planForTheWeek,
    4, // threshold of content items to return; 4 is semi-arbitrary, as 1 less than 5 (the number of weekdays)
  );
  console.log(
    `Recommended resources: ${JSON.stringify(suggestedResources, null, 2)}`,
  );

  const motivationalQuote = {
    quote: "Every action you take is a vote for the person you wish to become.",
    speaker: "James Clear",
    source: "Atomic Habits",
    link: "https://www.amazon.de/-/en/Atomic-Habits-life-changing-million-bestseller/dp/1847941834", // TODO: get this from the database
  };
  const weeklyEmailRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST,
    WEEKLY_EMAIL_PREMISE,
    JSON.stringify({
      clientName: userName || "Jane",
      plan: planForTheWeek,
      suggestedResources: suggestedResources,
      motivationalQuote: motivationalQuote,
    }),
    ultimateGoal,
  );

  const suggestedResourcesLinks = suggestedResources.map((resource) =>
    resource.link
  );
  const expectedStrings = [
    ...suggestedResourcesLinks,
    motivationalQuote.quote,
    motivationalQuote.link,
    STRIPE_PAYMENT_LINK,
  ];

  console.log(`expectedStrings: ${JSON.stringify(expectedStrings, null, 2)}`);

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

  if (!validateWeeklyEmail(weeklyEmail, expectedStrings)) {
    // TODO: determine whether to retry when the weekly email is invalid
    throw new Error("Invalid weekly email");
  }

  const cleanedWeeklyEmail = cleanWeeklyEmail(weeklyEmail);

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({
      from: "jason@eras.fyi",
      to: "jason@eras.fyi",
      subject: "Welcome to eras 🌅 quote 4",
      html: cleanedWeeklyEmail,
    }),
  });

  const data = await emailResponse.json();
  console.log("Response from Resend:", JSON.stringify(data, null, 2));
}

async function getContentItemsForPlan(
  model: OpenAIEmbeddings,
  supabaseClient: SupabaseClient<Database>,
  planForTheWeek: string,
  contentItemsThreshold: number,
): Promise<ContentItem[]> {
  console.log(
    "Calling _llmInternals.embedAndGetSimilarDocuments...",
  );
  const documents = await _llmInternals.embedAndGetSimilarDocuments(
    model,
    supabaseClient,
    planForTheWeek,
    1000,
  );

  console.log(`Found ${documents.length} similar documents...`);
  console.log(
    "Calling _supabaseClientInternals.convertAndSortByCountAndSimilarity for the documents...",
  );

  const contentItems = _supabaseClientInternals
    .convertAndSortByCountAndSimilarity(documents, contentItemsThreshold);

  return contentItems;
}

function validateWeeklyEmail(
  weeklyEmail: string,
  expectedStrings: string[],
): boolean {
  console.log("Validating the weekly email...");

  // Confirming that each expected string appears exactly once
  console.log("Confirming that each expected string appears exactly once...");
  const allExpectedStringsPresent: boolean = expectedStrings.every((
    expectedString,
  ) => isExpectedStringPresentOnlyOnce(weeklyEmail, expectedString));
  console.log("allExpectedStringsPresent: ", allExpectedStringsPresent);

  // Confirming that no unexpected links are present
  console.log("Confirming that no unexpected links are present...");
  const weeklyEmailWithoutStrings = removeStringsFromWeeklyEmail(
    weeklyEmail,
    expectedStrings,
  );
  const noUnexpectedLinksPresent =
    !(weeklyEmailWithoutStrings.includes("https://") ||
      weeklyEmailWithoutStrings.includes("http://"));
  console.log("noUnexpectedLinksPresent: ", noUnexpectedLinksPresent);

  return allExpectedStringsPresent && noUnexpectedLinksPresent;
}

function isExpectedStringPresentOnlyOnce(
  weeklyEmail: string,
  expectedString: string,
): boolean {
  const lowerWeeklyEmail = weeklyEmail.toLowerCase();
  const lowerExpectedString = expectedString.toLowerCase();
  const regex = new RegExp(lowerExpectedString, "g");
  const matches = lowerWeeklyEmail.match(regex);

  const isPresentOnlyOnce = (!matches || matches.length != 1) ? false : true;

  console.log(`"${expectedString}" is present only once: ${isPresentOnlyOnce}`);

  return isPresentOnlyOnce;
}

function removeStringsFromWeeklyEmail(
  weeklyEmail: string,
  links: string[],
): string {
  for (const link of links) {
    // Using a global regular expression to replace all instances of the substring
    const regex = new RegExp(link, "g");
    weeklyEmail = weeklyEmail.replace(regex, "");
  }
  return weeklyEmail;
}

function cleanWeeklyEmail(weeklyEmail: string): string {
  console.log("Cleaning up the weekly email...");
  const withoutTripleQuotes = weeklyEmail.replace(new RegExp(`"""`, "g"), "");
  const withoutTripleBackticks = withoutTripleQuotes.replace(
    new RegExp("```", "g"),
    "",
  );

  return withoutTripleBackticks;
}

// _internals are used for testing
export const _internals = {
  handleRequest,
};
