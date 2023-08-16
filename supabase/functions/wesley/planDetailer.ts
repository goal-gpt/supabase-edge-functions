import {
  _internals as _llmInternals,
  ModelsContext,
  OpenAIEmbeddings,
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

  // const recommendedResources = await getContentItemsForPlan(
  //   modelsContext.embed,
  //   supabaseClient,
  //   planForTheWeek,
  //   4, // threshold of content items to return; 4 is semi-arbitrary, as 1 less than 5 (the number of weekdays)
  // );
  // console.log(
  //   `Recommended resources: ${JSON.stringify(recommendedResources, null, 2)}`,
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

  // console.log(
  //   "Calling OpenAI to get the weekly email",
  //   weeklyEmailRequestMessage,
  // );
  const weeklyEmailRequestMessage = new SystemChatMessage(
    `You \are an empathetic, emotionally-aware, and imaginative AI coaching app called "eras". ` +
    `You have already prepared a personalized 12 - week program for a client. ` +
    `Your task is to write an email to the client about the first week of the program, delimited by ###, ` +
    `by perform the following actions: 1. Write a friendly HTML email from the eras team to the client that: ` +
    `a.introduces them to eras and the program; ` +
    `b.explains that the program is customized to them; ` +
    `c.explains how the program will help them achieve their goal, delimited by """; ` +
    `d.includes the plan from the first week of the program; and ` +
    `e.lists the suggested resources from the first week of the program under the heading "Suggested Resources". ` +
    `2. Add the following inspirational quote from James Clear\'s "Atomic Habits" to the email: ` +
    `"Every action you take is a vote for the person you wish to become." ` +
    `3. Add a small number of emojis to make the email more engaging. ` +
    `4. Do not address the client by name in the email because that information is not available. ` +
    `5. Before ending the email, invite the client to pay GBP 3 for the next week of the program and include a button with: ` +
    `a. border-radius: 6px; b. background-color: #77b5fb; ` +
    `c. text: "Pay for Week 2"; and d. link: "https://buy.stripe.com/dR62c5flt9nu8qk3cc". ` +
    `6. Return your response as HTML.\n` +
    `7. Always write "eras" in lowercase, bold, and black in the email. ` +
    `8. Make all headings black.\n` +
    `Week 1: \n###{ "plan": "Week 1: Researching the Freelance Recruitment Consultant or Headhunter Industry in Spain\\n\\nDay 1:\\n- Read books and articles about the freelance recruitment consultant or headhunter industry\\n- Spend 30 minutes researching online to find reputable books and articles on the topic\\n\\nDay 2:\\n- Attend industry conferences and events to network with professionals in the field\\n- Research upcoming conferences and events in your area or online, and mark them on your calendar\\n\\nDay 3:\\n- Join online forums and communities to connect with experienced freelance recruitment consultants or headhunters\\n- Spend 30 minutes searching for online forums and communities related to freelance recruitment consulting or headhunting, and join one that resonates with you\\n\\nDay 4:\\n- Create a list of potential clients and companies to target for your services\\n- Spend 30 minutes brainstorming and researching potential clients and companies that align with your interests and expertise\\n\\nDay 5:\\n- Reflect on your progress and experiences from the week\\n- Take 10 minutes to journal about what you\'ve learned so far and any insights or ideas that have come up\\n\\nDay 6 and Day 7:\\n- Take a break and engage in self-care activities that recharge you for the upcoming week. This could include hobbies, spending time with loved ones, or practicing mindfulness. Remember to prioritize your well-being throughout this journey.\\n\\n###\\n\\nClient\'s Ultimate Goal:\\n\\"\\"\\"\\nThe ultimate goal is to change careers and become a self - employed freelance recruitment consultant or headhunter, starting to earn money in this role within the next 6 months, and seeking assistance in creating a plan and budget to get started.\\n\\"\\"\\"\\n\\nAdditional Activity 1: Exploring the Freelance Recruitment Consultant or Headhunter Market\\n- Spend 30 minutes researching the current demand for freelance recruitment consultants or headhunters in your target market. Look for trends, growth opportunities, and potential challenges.\\n\\nAdditional Activity 2: Identifying Transferable Skills and Expertise\\n- Take some time to reflect on your current skills and expertise that can be transferred to the freelance recruitment consultant or headhunter role. Write down a list of these skills and think about how they can be valuable in your new career.", "suggestedResources": [{ "title": "How To Become A Financial Advisor As A Career Changer", "link": "https://www.kitces.com/blog/become-financial-advisor-planner-career-changer-education-training-cost-timeline-transition-plan/" }, { "title": "How to Make Money as a Freelance Recruiter - Vital Dollar", "link": "https://vitaldollar.com/freelance-recruiter/" }, { "title": "How to Become a Freelance Recruiter in 2023", "link": "https://www.manatal.com/blog/freelance-recruiter" }, { "title": "How To Finance Your Career Change: The Complete Guide (With Real-life Stories And Honest Numbers) | Careershifters", "link": "https://www.careershifters.org/expert-advice/how-to-finance-your-career-change" }] }###\nClient\'s Ultimate Goal:\n"""\nThe ultimate goal is to change careers and become a self-employed freelance recruitment consultant or headhunter, starting to earn money in this role within the next 6 months, and seeking assistance in creating a plan and budget to get started.\n"""`,
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

  if (!validateWeeklyEmail(weeklyEmail)) throw new Error("Invalid weekly email");

  const cleanedWeeklyEmail = getCleanedWeeklyEmail(weeklyEmail);

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({
      from: "jason@eras.fyi",
      to: "jason@eras.fyi",
      subject: "Welcome to eras 🌅 #77b5fb spain 3",
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

function validateWeeklyEmail(weeklyEmail: string): boolean {
  console.log("Validating the weekly email...");
  const isValid = weeklyEmail.includes(`href="https://buy.stripe.com/dR62c5flt9nu8qk3cc"`);

  return isValid;
}

function getCleanedWeeklyEmail(weeklyEmail: string): string {
  console.log("Cleaning up the weekly email...");
  const cleandedWeeklyEmail = weeklyEmail.replace(new RegExp(`"""`, 'g'), '');

  return cleandedWeeklyEmail;
}

// _internals are used for testing
export const _internals = {
  handleRequest,
};
