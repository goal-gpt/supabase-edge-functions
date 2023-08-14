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

  // const suggestedReadings = await getContentItemsForPlan(
  //   modelsContext.embed,
  //   supabaseClient,
  //   planForTheWeek,
  //   4, // threshold of content items to return; 4 is semi-arbitrary, as 1 less than 5 (the number of weekdays)
  // );
  // console.log(
  //   `Suggested readings: ${JSON.stringify(suggestedReadings, null, 2)}`,
  // );

  // const weeklyEmailRequestMessage = await _llmInternals.getSystemMessage(
  //   TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST,
  //   WEEKLY_EMAIL_PREMISE,
  //   JSON.stringify({
  //     plan: planForTheWeek,
  //     suggestedReadings: suggestedReadings,
  //   }),
  //   ultimateGoal,
  // );
  const weeklyEmailRequestMessage = new SystemChatMessage("You are an empathetic, emotionally-aware, and imaginative AI coaching app called \"eras\". You have already prepared a personalized 12-week program for a client. Your task is to perform the following actions: 1. Write a friendly HTML email from the eras team to the client that introduces them to eras and the program, explains that the program is customized to them and will help them achieve their goal, delimited by \"\"\", and provides the first week of the 12-week program, delimited by ###. 2. Add the following inspirational quote from James Clear's \"Atomic Habits\" to the email: \"Every action you take is a vote for the person you wish to become.\" 3. Add a small number of emojis to make the email more engaging. 4. Do not address the client by name in the email because that information is not available. 5. Always write \"eras\" in lowercase, bold, and black in the email. 6. Before ending the email, invite the client to pay GBP 3 for the next week of the program if they would like to continue and include a button with the text \"Pay for Week 2\" and the link, \"https://buy.stripe.com/dR62c5flt9nu8qk3cc\". 7. Return your response as HTML.\nWeek 1:\n###{\"plan\":\"Week 1: Researching the Freelance Recruitment Consultant or Headhunter Industry\\n\\nDay 1:\\n- Read a book or article about the freelance recruitment consultant or headhunter industry\\n- Take notes on key insights and ideas from the reading\\n\\nDay 2:\\n- Attend an industry conference or event to network with professionals in the field\\n- Introduce yourself to at least three people and exchange contact information\\n\\nDay 3:\\n- Join an online forum or community for freelance recruitment consultants or headhunters\\n- Introduce yourself and engage in discussions with experienced professionals\\n\\nDay 4:\\n- Continue participating in the online forum or community\\n- Ask questions and seek advice from experienced professionals\\n\\nDay 5:\\n- Create a list of potential clients and companies to target for your services\\n- Research each company to understand their needs and requirements\\n\\nDay 6:\\n- Review your list of potential clients and companies\\n- Prioritize them based on their potential for collaboration and success\\n\\nDay 7:\\n- Reflect on your research and networking experiences from the past week\\n- Identify any gaps in your knowledge or areas where you need further exploration\\n\\n###\\n\\nClient's Ultimate Goal:\\n\\\"\\\"\\\"\\nThe ultimate goal is to change careers and become a self-employed freelance recruitment consultant or headhunter, starting to earn money in this role within the next 6 months, and seeking assistance in creating a plan and budget to get started.\\n\\\"\\\"\\\"\\n\\nAdditional Activity 1: Exploring the Freelance Recruitment Consultant or Headhunter Market\\n- Research the current demand for freelance recruitment consultants or headhunters in your target market\\n- Identify any niche areas or industries where there is a higher demand for your services\\n\\nAdditional Activity 2: Developing a Personal Brand\\n- Define your unique value proposition as a freelance recruitment consultant or headhunter\\n- Create a professional website or online portfolio to showcase your skills and expertise\",\"suggestedReadings\":[{\"title\":\"How To Become A Financial Advisor As A Career Changer\",\"link\":\"https://www.kitces.com/blog/become-financial-advisor-planner-career-changer-education-training-cost-timeline-transition-plan/\"},{\"title\":\"How to Make Money as a Freelance Recruiter - Vital Dollar\",\"link\":\"https://vitaldollar.com/freelance-recruiter/\"},{\"title\":\"How to Become a Freelance Recruiter in 2023\",\"link\":\"https://www.manatal.com/blog/freelance-recruiter\"},{\"title\":\"Freelance Recruiter: What is it & How to become one\",\"link\":\"https://rockcontent.com/blog/freelance-recruiter/\"}]}###\nClient's Ultimate Goal:\n\"\"\"\nThe ultimate goal is to change careers and become a self-employed freelance recruitment consultant or headhunter, starting to earn money in this role within the next 6 months, and seeking assistance in creating a plan and budget to get started.\n\"\"\"");
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

  // const emailResponse = await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
  //   },
  //   body: JSON.stringify({
  //     from: "jason.banks@eras.fyi",
  //     to: "jason.banks@eras.fyi",
  //     subject: "Welcome to eras 🌅",
  //     html: weeklyEmail,
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

// _internals are used for testing
export const _internals = {
  handleRequest,
};
