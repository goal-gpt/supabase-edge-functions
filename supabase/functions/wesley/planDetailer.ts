import {
  _internals as _llmInternals,
  ChatOpenAI,
  ModelsContext,
  OpenAIEmbeddings,
  SystemChatMessage,
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
import { all } from "https://esm.sh/v127/axios@1.4.0/index.js";

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

  // TODO: update so that the program corresponds to step 1 of the action plan
  const coachingProgramRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_COACHING_PROGRAM_REQUEST,
    COACHING_PROGRAM_PREMISE,
    messages,
    // JSON.stringify(plan),
    JSON.stringify({
      goal: plan.goal,
      steps: [{
        number: plan.steps[0].number,
        name: plan.steps[0].action.name,
        description: plan.steps[0].action.description,
        ideas: plan.steps[0].action.ideas,
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

  // const programReductionRequest = new SystemChatMessage(
  //   `Your task is to perform the following actions for the 1-week financial coaching plan delimited by """: 1. Break down each task into its individual components. 2. Estimate the time required for each item. 3. Calculate the total time required to complete the plan. ` +
  //     `4. Determine whether the plan takes more than 6 hours to complete. 5. If the plan takes more than 6 hours to complete, reduce the plan to what can be achieved within 6 hours and provide time estimates for each task. The plan must not require more than 6 hours of work.` +
  //     `\nPlan: \n"""${program}"""\n`,
  // );
  // console.log(
  //   "Calling OpenAI to get the reduced program",
  //   programReductionRequest,
  // );
  // const programReductionResponse = await _llmInternals.getChatCompletion(
  //   modelsContext.chat,
  //   [programReductionRequest],
  // );
  // const reducedProgram = programReductionResponse.text;
  // console.log(
  //   "Response from OpenAI to program reduction request: ",
  //   reducedProgram,
  // );

  const assignmentRequest = new SystemChatMessage(
    `You are an AI financial coach. You have prepared an outline of the first week of a financial coaching program, delimited by """. The plan will be followed by someone who has never done any of the tasks in the plan before. Your task is to: ` +
      `1. Distribute 6 hours across the tasks in the plan. Tasks can have from 30 minutes to 2 hours. ` +
      `2. Give detailed instructions about how to complete each task within the time alotted to the task. ` +
      `\nPlan: \n"""${program}"""\n`,
  );
  console.log(
    "Calling OpenAI to get the program with assignments",
    assignmentRequest,
  );
  const assignmentRequestResponse = await _llmInternals.getChatCompletion(
    modelsContext.chat,
    [assignmentRequest],
  );
  const assignments = assignmentRequestResponse.text;
  console.log(
    "Response from OpenAI to program assignment request: ",
    assignments,
  );

  // await confirmOrContinuePlanReduction(
  //   modelsContext.chat,
  //   assignments,
  // );

  // const firstWeek = program.substring(0, program.indexOf("Week 2"));

  // const planForTheWeekRequestMessage = await _llmInternals.getSystemMessage(
  //   TEMPLATE_FOR_PLAN_FOR_THE_WEEK_REQUEST,
  //   PLAN_FOR_THE_WEEK_PREMISE,
  //   firstWeek,
  //   plan.goal,
  // );

  // console.log(
  //   "Calling OpenAI to get the plan for the week",
  //   planForTheWeekRequestMessage,
  // );

  // const planForTheWeekRequestResponse = await _llmInternals.getChatCompletion(
  //   modelsContext.chat,
  //   [planForTheWeekRequestMessage],
  // );
  // const planForTheWeek = planForTheWeekRequestResponse.text;

  // console.log(
  //   "Response from OpenAI to plan for the week request: ",
  //   planForTheWeek,
  // );

  const suggestedResources = await getContentItemsForPlan(
    modelsContext.embed,
    supabaseClient,
    assignments,
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
      program: assignments,
      suggestedResources: { usageNote: "We've curated a selection of resources for you. Even if some don't seem relevant to your goal, we encourage you to give them a try 🙂", resources: suggestedResources },
      motivationalQuote: motivationalQuote,
    }),
    JSON.stringify({
      goal: plan.goal,
      steps: plan.steps.map((step) => ({
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
      from: "jason@eras.fyi",
      to: "jason@eras.fyi",
      subject: `Welcome to eras 🌅 (${Date.now()})`,
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

function emptyRawLinks(plan: Plan): void {
  console.log("Emptying raw links...");
  plan.steps.forEach((step) => {
    if (step.action.rawLinks) {
      step.action.rawLinks = [];
    }
  });
}

// This is hacky and should be replaced with a more robust solution
async function confirmOrContinuePlanReduction(
  chatModel: ChatOpenAI,
  program: string,
): Promise<string> {
  const reductionConfirmation = "No reduction required.";
  const reductionConfirmationBuffer = 100;
  let latestPlan = program;
  let counter = 0;
  const maxRetries = 3;

  while (counter < maxRetries) {
    console.log("Confirming or continuing plan reduction...");
    console.log("Counter: ", counter);
    // Confirm the plan is reduced or continue the reduction
    const reductionRequest = new SystemChatMessage(
      `Your task is to perform the following actions for the 1-week financial coaching plan delimited by """: ` +
        `1. Estimate the time required for each task. ` +
        `2. Calculate the total time required to complete the plan. ` +
        `3. Determine whether the plan takes more than 6 hours to complete. ` +
        `4. If the plan takes more than 6 hours to complete, reduce the plan to what can be achieved within 6 hours and provide time estimates for each task. ` +
        `The plan must not require more than 6 hours of work. ` +
        `If the plan takes does not take more than 6 hours to complete, then respond only with "${reductionConfirmation}".` +
        `\nPlan: \n"""${latestPlan}"""\n`,
    );
    console.log(
      "Calling OpenAI to confirm or reduce the plan",
      reductionRequest,
    );
    const reductionResponse = await _llmInternals.getChatCompletion(
      chatModel,
      [reductionRequest],
    );

    const reductionResponseText = reductionResponse.text;
    console.log(
      "Response from OpenAI to program reduction request: ",
      reductionResponseText,
    );

    if (
      reductionResponseText.length <
        reductionConfirmation.length + reductionConfirmationBuffer
    ) {
      console.log("Plan reduction confirmed.");

      break;
    }

    // Extract the plan from the AI response
    latestPlan = reductionResponseText;
    const extractionRequest = new SystemChatMessage(
      `Your task is to extract the reduced financial coaching plan from the AI response delimited by """` +
        `\nPlan: \n"""${latestPlan}"""\n`,
    );

    console.log(
      "Calling OpenAI to get the extracted plan",
      extractionRequest,
    );

    const extractionResponse = await _llmInternals.getChatCompletion(
      chatModel,
      [extractionRequest],
    );
    latestPlan = extractionResponse.text;

    console.log(
      "Response from OpenAI to plan extraction request: ",
      latestPlan,
    );

    counter++;
  }

  console.log("Final plan: ", latestPlan);

  const finalExtraction = new SystemChatMessage(
    `Your task is to extract the days, tasks, and times for the financial coaching plan in the following AI response: ${latestPlan}`,
  );
  console.log(
    "Calling OpenAI to get the final extracted plan",
    finalExtraction,
  );
  const finalExtractionResponse = await _llmInternals.getChatCompletion(
    chatModel,
    [finalExtraction],
  );
  latestPlan = finalExtractionResponse.text;
  console.log(
    "Response from OpenAI to final plan extraction request: ",
    latestPlan,
  );

  return latestPlan;
}

// _internals are used for testing
export const _internals = {
  handleRequest,
};
