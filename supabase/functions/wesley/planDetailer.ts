import {
  _internals as _llmInternals,
  ModelsContext,
  OpenAIEmbeddings,
  SystemChatMessage,
} from "../_shared/llm.ts";
import {
  COACHING_PROGRAM_PREMISE,
  STRIPE_PAYMENT_LINK,
  TEMPLATE_FOR_COACHING_PROGRAM_REQUEST,
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
  const { messages, plan: actionPlan, userName } = wesleyRequest;
  console.log("Action plan:", actionPlan);

  const coachingProgramRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_COACHING_PROGRAM_REQUEST,
    COACHING_PROGRAM_PREMISE,
    messages,
    JSON.stringify({
      goal: actionPlan.goal,
      steps: [{
        number: actionPlan.steps[0].number,
        name: actionPlan.steps[0].action.name,
        description: actionPlan.steps[0].action.description,
        ideas: actionPlan.steps[0].action.ideas,
      }],
    }),
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

  const distributionRequest = new SystemChatMessage(
  `You are an AI coach. ` +
      `You have prepared an outline of the first week of a coaching program, delimited by """. The plan will be followed by someone who has never done any of the tasks in the plan before. Your task is to: ` +
      `1. Distribute 6 hours across the tasks in the plan. Tasks can have from 30 minutes to 2 hours. ` +
      `2. Give instructions about how to complete each task within the time alotted to the task. ` +
      `\nPlan: \n"""${program}"""\n`,
  );
  console.log(
    "Calling OpenAI to get the program with time distributions",
    distributionRequest,
  );
  const distributionRequestResponse = await _llmInternals.getChatCompletion(
    modelsContext.chat,
    [distributionRequest],
  );
  const programWithTimes = distributionRequestResponse.text;
  console.log(
    "Response from OpenAI to time distribution request: ",
    programWithTimes,
  );

  // TODO: (1) ask AI to extract product names from the program and (2) use Resend to send that in an email to info@eras as an affiliates to add

  const suggestedResources = await getContentItemsForPlan(
    modelsContext.embed,
    supabaseClient,
    `clientMessages: ${messages}, goal: ${actionPlan.goal}, program: ${programWithTimes}`,
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
      program: programWithTimes,
      suggestedResources: {
        usageNote:
          "We've curated a selection of resources for you. Even if some don't seem relevant to your goal, we encourage you to give them a try 🙂",
        resources: suggestedResources,
      },
      motivationalQuote: motivationalQuote,
    }),
    JSON.stringify({
      goal: actionPlan.goal,
      steps: actionPlan.steps.map((step) => ({
        number: step.number,
        name: step.action.name,
      })),
    }),
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

  if (!allExpectedStringsPresent) return allExpectedStringsPresent;

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
    "mailto:",
  ];
  const noBadStringsFound = badStrings.every((badString) => {
    const isNotFound = !weeklyEmailWithoutExpectedStrings.includes(badString);
    console.log(`"${badString}" is not found: ${isNotFound}`);

    return isNotFound;
  });

  console.log("noBadStringsFound: ", noBadStringsFound);

  if (!noBadStringsFound) return noBadStringsFound;

  return true;
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
