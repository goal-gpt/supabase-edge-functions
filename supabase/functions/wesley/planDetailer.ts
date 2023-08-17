import {
  _internals as _llmInternals,
  ModelsContext,
  OpenAIEmbeddings,
} from "../_shared/llm.ts";
import {
  COACHING_PROGRAM_PREMISE,
  Plan,
  PLAN_FOR_THE_WEEK_PREMISE,
  STRIPE_PAYMENT_LINK,
  TEMPLATE_FOR_COACHING_PROGRAM_REQUEST,
  TEMPLATE_FOR_PLAN_FOR_THE_WEEK_REQUEST,
  TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST,
  WEEKLY_EMAIL_PREMISE,
} from "../_shared/plan.ts";
import { WesleyRequest } from "./wesley.ts";
import {
  _internals as _supabaseClientInternals,
  ContentItem,
  SupabaseClient,
} from "../_shared/supabaseClient.ts";
import { Database } from "../../types/supabase.ts";

export const MOTIVATIONAL_quote =
  "Every action you take is a vote for the person you wish to become.";
export const MOTIVATIONAL_speaker = "James Clear";
export const MOTIVATIONAL_source = "Atomic Habits";
export const MOTIVATIONAL_link =
  "https://www.amazon.de/-/en/Atomic-Habits-life-changing-million-bestseller/dp/1847941834"; // TODO: get this from the database

async function handleRequest(
  modelsContext: ModelsContext,
  supabaseClient: SupabaseClient<Database>,
  wesleyRequest: WesleyRequest,
) {
  console.log("Handling request:", wesleyRequest);
  const { messages, plan, userName } = wesleyRequest;

  // Remove raw links to reduce size and scope of what is sent to OpenAI
  emptyRawLinks(plan);

  const coachingProgramRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_COACHING_PROGRAM_REQUEST,
    COACHING_PROGRAM_PREMISE,
    messages,
    JSON.stringify(plan),
  );

  console.log(
    "Calling OpenAI to get the coaching program",
    coachingProgramRequestMessage,
  );

  const coachingProgramRequestResponse = await _llmInternals.getChatCompletion(
    modelsContext.chat,
    [coachingProgramRequestMessage],
  );
  const program = coachingProgramRequestResponse.text;

  console.log(
    "Response from OpenAI to program request: ",
    program,
  );

  const firstWeek = program.substring(0, program.indexOf("Week 2"));

  const planForTheWeekRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_PLAN_FOR_THE_WEEK_REQUEST,
    PLAN_FOR_THE_WEEK_PREMISE,
    firstWeek,
    plan.goal,
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
    `Suggested resources: ${JSON.stringify(suggestedResources, null, 2)}`,
  );

  // TODO: make this programmatic
  const motivationalQuote = {
    quote: MOTIVATIONAL_quote,
    speaker: MOTIVATIONAL_speaker,
    source: MOTIVATIONAL_source,
    link: MOTIVATIONAL_link,
  };
  const weeklyEmailRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST,
    WEEKLY_EMAIL_PREMISE,
    JSON.stringify({
      clientName: userName || "friend",
      plan: planForTheWeek,
      suggestedResources: suggestedResources,
      motivationalQuote: motivationalQuote,
    }),
    plan.goal,
  );

  const suggestedResourcesLinks = suggestedResources.map((resource) =>
    resource.link
  );
  const runtimeExpectedStrings = [
    motivationalQuote.quote,
    motivationalQuote.link,
    ...suggestedResourcesLinks,
  ];

  console.log(
    `runtimeExpectedStrings: ${
      JSON.stringify(runtimeExpectedStrings, null, 2)
    }`,
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

  if (!validateWeeklyEmail(weeklyEmail, runtimeExpectedStrings)) {
    // TODO: determine whether to automatically retry when the weekly email is invalid
    throw new Error("Invalid weekly email");
  }

  const cleanedWeeklyEmail = cleanWeeklyEmail(weeklyEmail);

  console.log("Sending weekly email to Resend...");
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({
      from: "info@eras.fyi",
      to: "info@eras.fyi",
      subject: "Welcome to eras 🌅",
      html: cleanedWeeklyEmail,
    }),
  });

  const data = await resendResponse.json();
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
  runtimeExpectedStrings: string[],
): boolean {
  console.log("Validating the weekly email...");

  const expectedStrings = [
    "<html>",
    "</html>",
    STRIPE_PAYMENT_LINK,
    ...runtimeExpectedStrings,
  ];

  // Confirming that each expected string appears exactly once
  console.log("Confirming that each expected string appears exactly once...");

  const allExpectedStringsPresent: boolean = expectedStrings.every((
    expectedString,
  ) => isExpectedStringPresentOnlyOnce(weeklyEmail, expectedString));
  console.log("allExpectedStringsPresent: ", allExpectedStringsPresent);

  // Confirming that no bad strings are present
  console.log("Confirming that no bad strings are present...");

  const weeklyEmailWithoutExpectedStrings = removeStringsFromWeeklyEmail(
    weeklyEmail,
    expectedStrings,
  );
  const badStrings = [
    "https://",
    "http://",
    "week 3", // TODO: make dynamic based on the week
  ];
  const noBadStringsFound = badStrings.every((badString) =>
    !weeklyEmailWithoutExpectedStrings.includes(badString)
  );

  console.log("noBadStringsFound: ", noBadStringsFound);

  return allExpectedStringsPresent && noBadStringsFound;
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

function emptyRawLinks(plan: Plan): void {
  console.log("Emptying raw links...");
  plan.steps.forEach((step) => {
    if (step.action.rawLinks) {
      step.action.rawLinks = [];
    }
  });
}

// _internals are used for testing
export const _internals = {
  handleRequest,
};
