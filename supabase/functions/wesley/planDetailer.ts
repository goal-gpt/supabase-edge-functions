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
  // console.log("Handling request:", wesleyRequest);
  // const { messages, plan } = wesleyRequest;
  // const weeklyPlanRequestMessage = await _llmInternals.getSystemMessage(
  //   TEMPLATE_FOR_WEEKLY_PLAN_REQUEST,
  //   WEEKLY_PLAN_PREMISE,
  //   messages,
  //   JSON.stringify(plan),
  // );
  // console.log("Calling OpenAI to get weekly plan", weeklyPlanRequestMessage);
  // const weeklyPlanRequestResponse = await _llmInternals.getChatCompletion(
  //   modelsContext.chat,
  //   [weeklyPlanRequestMessage],
  // );
  // const weeklyPlan = weeklyPlanRequestResponse.text;

  // console.log(
  //   "Response from OpenAI to weekly plan request: ",
  //   weeklyPlan,
  // );

  // const firstWeek = weeklyPlan.substring(0, weeklyPlan.indexOf("Week 2"));

  // const ultimateGoalMessage = new SystemChatMessage(
  //   `Provide a concise summary in 1 sentence of the ultimate goal of someone ` +
  //     `who provides the following information to a financial coach ` +
  //     `once money is no longer an obstacle to their goal: "${messages}". ` +
  //     `Describe only the goal. Do not mention financial constraints, money, ` +
  //     `savings, debt, assets, finances, obstacles, hurdles, struggles, or ` +
  //     `challenges to achieving the goal.`,
  // );

  // console.log("Calling OpenAI to get the ultimate goal", ultimateGoalMessage);

  // const ultimateGoalResponse = await _llmInternals.getChatCompletion(
  //   modelsContext.chat,
  //   [ultimateGoalMessage],
  // );

  // console.log(
  //   "Response from OpenAI to ultimate goal request:",
  //   ultimateGoalResponse,
  // );

  // const ultimateGoal = ultimateGoalResponse.text;

  // const planForTheWeekRequestMessage = await _llmInternals.getSystemMessage(
  //   TEMPLATE_FOR_PLAN_FOR_THE_WEEK_REQUEST,
  //   PLAN_FOR_THE_WEEK_PREMISE,
  //   firstWeek,
  //   ultimateGoal,
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

  // const suggestedResources = await getContentItemsForPlan(
  //   modelsContext.embed,
  //   supabaseClient,
  //   planForTheWeek,
  //   4, // threshold of content items to return; 4 is semi-arbitrary, as 1 less than 5 (the number of weekdays)
  // );
  // console.log(
  //   `Recommended resources: ${JSON.stringify(suggestedResources, null, 2)}`,
  // );

  // const weeklyEmailRequestMessage = await _llmInternals.getSystemMessage(
  //   TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST,
  //   WEEKLY_EMAIL_PREMISE,
  //   JSON.stringify({
  //     plan: planForTheWeek,
  //     suggestedResources: suggestedResources,
  //   }),
  //   ultimateGoal,
  // );
  const suggestedResources = [
    {
      "title": "How To Become A Financial Advisor As A Career Changer",
      "link":
        "https://www.kitces.com/blog/become-financial-advisor-planner-career-changer-education-training-cost-timeline-transition-plan/",
    },
    {
      "title": "Creating Your Career Change Budget: 10 Tips | FlexJobs",
      "link": "https://www.flexjobs.com/blog/post/career-change-budget/",
    },
    {
      "title":
        "How To Finance Your Career Change: The Complete Guide (With Real-life Stories And Honest Numbers) | Careershifters",
      "link":
        "https://www.careershifters.org/expert-advice/how-to-finance-your-career-change",
    },
    {
      "title": "How to Afford a Career Change (Without Struggling!) - Unmudl",
      "link": "https://unmudl.com/blog/affording-career-change",
    },
  ];
  const weeklyEmailRequestMessage = new SystemChatMessage(
    `You are an AI financial coaching app called "eras". You are empathetic, emotionally-aware, and imaginative. ` +
      `You have already prepared a personalized 12 - week program for a client.Your task is to write an email to the client ` +
      `about the first week of the program, delimited by ###, by perform the following actions: 1. Write a friendly HTML email ` +
      `from the eras team to the client that: a.introduces them to eras and the program; b.explains that the program is ` +
      `customized to them; c.explains how the program will help them achieve their goal, delimited by """; d.includes the plan ` +
      `from the first week of the program; and e.lists the suggested resources from the first week of the program under the heading ` +
      `"Suggested Resources". 2. Add the following motivational quote from James Clear\'s "Atomic Habits" to the email: "Every action you ` +
      `take is a vote for the person you wish to become." 3. Add a small number of emojis to make the email more engaging. 4. ` +
      `Do not address the client by name in the email because that information is not available. 5. Before ending the email, ` +
      `invite the client to pay GBP 3 for the next week of the program and include a button with: a.border - radius: 6px; b.background - color: ` +
      `#77b5fb; c.text: "Pay for Week 2"; and d.link: "https://buy.stripe.com/dR62c5flt9nu8qk3cc". 6. Return your response as HTML. ` +
      `7. Always write "eras" in lowercase, bold, and black in the email. 8. Make all headings black.` +
      `\nWeek 1: \n###{ "plan": "Week 1: Research and Planning\\n\\nDay 1:\\n- Research nursing programs and financial aid options. Look for nursing programs at local colleges and universities. Consider online nursing programs that offer flexibility in terms of schedule and location.\\n\\nDay 2:\\n- Create a budget and savings plan. Track your expenses and identify areas where you can reduce spending. Consider taking on a part-time job or freelance work to increase your income and save more money.\\n\\nDay 3:\\n- Explore financial assistance options. Check with local hospitals, healthcare organizations, and nursing associations for scholarship opportunities. Research national and international scholarships for nursing students.\\n\\nDay 4:\\n- Explore part-time or flexible job opportunities in the healthcare field. Search online job boards for part-time healthcare positions. Reach out to local healthcare facilities and inquire about part-time job opportunities.\\n\\nDay 5:\\n- Reflect on your research and planning progress. Take some time to think about your motivations and goals for transitioning into the healthcare field. Consider how becoming a nurse will allow you to make a more meaningful impact.\\n\\nDay 6:\\n- Review your budget and savings plan. Make any necessary adjustments and continue tracking your expenses. Look for additional ways to save money and increase your income.\\n\\nDay 7:\\n- Continue exploring financial assistance options. Reach out to nursing associations and organizations to inquire about any additional scholarship opportunities. Consider attending virtual information sessions or webinars to learn more about financial aid options for nursing students.\\n\\nClient\'s Ultimate Goal:\\n\\"The ultimate goal is to transition into the healthcare field and become a nurse in order to make a more meaningful impact.\\"", "suggestedResources": [{ "title": "How To Become A Financial Advisor As A Career Changer", "link": "https://www.kitces.com/blog/become-financial-advisor-planner-career-changer-education-training-cost-timeline-transition-plan/" }, { "title": "Creating Your Career Change Budget: 10 Tips | FlexJobs", "link": "https://www.flexjobs.com/blog/post/career-change-budget/" }, { "title": "How To Finance Your Career Change: The Complete Guide (With Real-life Stories And Honest Numbers) | Careershifters", "link": "https://www.careershifters.org/expert-advice/how-to-finance-your-career-change" }, { "title": "How to Afford a Career Change (Without Struggling!) - Unmudl", "link": "https://unmudl.com/blog/affording-career-change" }] }###\nClient\'s Ultimate Goal:\n"""\nThe ultimate goal is to transition into the healthcare field and become a nurse in order to make a more meaningful impact.\n"""`,
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

  const suggestedResourcesLinks = suggestedResources.map((resource) =>
    resource.link
  );
  const expectedLinks = [
    ...suggestedResourcesLinks,
    STRIPE_PAYMENT_LINK,
  ];

  if (!validateWeeklyEmail(weeklyEmail, expectedLinks)) {
    // TODO: if the weekly email is invalid, try again
    throw new Error("Invalid weekly email");
  }

  const cleanedWeeklyEmail = cleanWeeklyEmail(weeklyEmail);

  // const emailResponse = await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
  //   },
  //   body: JSON.stringify({
  //     from: "jason@eras.fyi",
  //     to: "jason@eras.fyi",
  //     subject: "Welcome to eras 🌅 self-description 3",
  //     html: cleanedWeeklyEmail,
  //   }),
  // });

  // const data = await emailResponse.json();
  // console.log("Response from Resend:", JSON.stringify(data, null, 2));
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
  expectedLinks: string[],
): boolean {
  console.log("Validating the weekly email...");

  // TODO: Confirm that motivational quote appears only once

  // Confirming that all links are present
  // TODO: confirm that expected links only appear once

  // Confirming that all links are present
  const allExpectedLinksPresent: boolean = expectedLinks.every((link) =>
    weeklyEmail.includes(link)
  );
  console.log("allExpectedLinksPresent: ", allExpectedLinksPresent);

  // Confirming that no unexpected links are present
  const weeklyEmailWithoutLinks = removeLinksFromWeeklyEmail(
    weeklyEmail,
    expectedLinks,
  );
  const noUnexpectedLinksPresent =
    !(weeklyEmailWithoutLinks.includes("https://") ||
      weeklyEmailWithoutLinks.includes("http://"));
  console.log("noUnexpectedLinksPresent: ", noUnexpectedLinksPresent);

  return allExpectedLinksPresent && noUnexpectedLinksPresent;
}

function removeLinksFromWeeklyEmail(
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
