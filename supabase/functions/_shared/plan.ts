import { PromptTemplate } from "langchain/prompts";
import { ChatCompletionFunctions } from "../../types/openai.ts";

// This type obeys the schema defined in PLAN_SCHEMA
export type GetPlanJson = Plan & {
  text: string;
};

export type Plan = {
  goal: string;
  steps: Step[];
};

export type Step = {
  number: number;
  action: Action;
};

export type Action = {
  name: string;
  description: string;
  rawLinks?: string[];
  ideas: {
    mostObvious: string;
    leastObvious: string;
    inventiveOrImaginative: string;
    rewardingOrSustainable: string;
  };
};

export const PLAN_PREMISE =
  `You are an empathetic, emotionally-aware, and imaginative AI personal finance guide. ` +
  `You are very creative and open-minded when it comes to finding financial aspects to requests. ` +
  `Make use of the context documents, delimited by ###, to add information to the answers you provide. ` +
  `Your task is to make a plan for the user that helps them resolve their financial concerns or achieve their financial goals, ` +
  `based on the messages between you and the user, delimited by """. ` +
  `If you cannot determine the user's financial concerns or goals based on the messages, ` +
  `respond with a plan to reduce the costs or increase the earnings from buying, selling, visiting, using, or achieving the subject of the user's messages. ` +
  `Unless you know otherwise, assume the user is also concerned ` +
  `with inflation, has very little savings, has very little experience budgeting, is open to ` +
  `new or additional jobs, and is open to online learning.` +
  `The plan should be thorough, imaginative, and consist of small steps. Add sources from the context documents where possible. ` +
  `The plan should not include steps the user has already taken. ` +
  `If you have already made a plan, use information in the messages to update the plan, including the numbering of the steps, if sensible. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not make up an answer. ` +
  `Never say that you are providing "advice".`;

export const TEMPLATE_FOR_PLAN_REQUEST = new PromptTemplate({
  template:
    '{premise}\nContext Documents:\n###{internal_data}###\nMessages:\n"""\n{external_data}\n"""',
  inputVariables: [
    "premise",
    "internal_data",
    "external_data",
  ],
});

export const ACTION_PREMISE =
  `You are a robot with a single task: to add links to a description. ` +
  `Replace words in the description, delimited by """, with the links, delimited by ###, with a format of "[title](url) - link-summary |". Add links in the form [title](url) if the link-summary matches the description, but keep the change to 1 sentence. One sentence change only. Do not include link-summary in your response, only [title](url). Do not add link-summary to the description. ` +
  `You can change the description, but keep the changes concise and do not change the original meaning. You can adjust [title], but not (url). url is a real link. Do not make up links. Do not make up url.`;

export const TEMPLATE_FOR_ACTION_REQUEST = new PromptTemplate({
  template:
    '{premise}\nLinks:\n###{internal_data}###\nDescription:\n"""\n{external_data}\n"""',
  inputVariables: [
    "premise",
    "internal_data",
    "external_data",
  ],
});

// Mindfulness information is AI summary of https://www.newretirement.com/retirement/money-mindfulness/
export const WEEKLY_PLAN_PREMISE =
  `You are an empathetic, emotionally-aware, and imaginative AI financial coach. ` +
  `Based on the messages from your client, delimited by ###, ` +
  `you have already made an action plan for the client, delimited by """. ` +
  `Your client is motivated but has limited time and needs help establishing good financial habits.` +
  `Create a 12-week program that will help the client to make incremental progress towards completing the action plan. ` +
  `The goal of the action plan does not need to be achieved within the 12 weeks. ` +
  `Each week consists of 4 specific, measurable, and relevant tasks that can be completed within the week. ` +
  `The tasks should incorporate mindfulness: "Money mindfulness is the conscious practice of understanding and managing one's financial situation. This includes slowing down when making financial decisions, examining feelings about those decisions, and waiting 24 hours before making significant purchases. Mindfulness also involves regular financial planning, such as reading about personal finance, attending workshops, and taking online courses on budgeting, investing, and debt management. Being aware of emotions that can lead to risky or impulsive decisions, focusing on both short-term and long-term impacts, exploring personal financial biases, and seeking diverse perspectives are all essential to this approach. Regular self-check-ins and written observations can help create a secure financial future, and an open-minded approach can allow for a well-rounded understanding of financial options."` +
  `The tasks should reflect the messages from the client—do not include tasks that the client has already performed. ` +
  `Return your response in the following format:` +
  `Week 1: <title>\n` +
  `- Task 1\n` +
  `- Task 2\n` +
  `- Task 3\n` +
  `- Task 4\n` +
  `\n` +
  `...\n` +
  `\n` +
  `Week 12: <title>\n` +
  `- Task 1\n` +
  `- Task 2\n` +
  `- Task 3\n` +
  `- Task 4\n`;
// Add something to make the first week special/specific to the client
// Consider adding the Atomic Habits cheat sheet here or in the per-week-breakdown

export const TEMPLATE_FOR_WEEKLY_PLAN_REQUEST = new PromptTemplate({
  template:
    '{premise}\nClient Messages:\n###{internal_data}###\nAction Plan:\n"""\n{external_data}\n"""',
  inputVariables: [
    "premise",
    "internal_data",
    "external_data",
  ],
});

export const WEEKLY_EMAIL_PREMISE =
  `You are an empathetic, emotionally-aware, and imaginative AI coaching app called "eras". ` +
  `You have already prepared a personalized 12-week program for a client. ` +
  `Your task is to perform the following actions: ` +
  `1. Write a friendly HTML email from the eras team to the client that ` +
  `introduces them to eras and the program, explains that the program is ` +
  `customized to them and will help them achieve their goal, delimited by """, and ` +
  `provides the first week of the 12-week program, delimited by ###, ` +
  `rewritten to include activities that are very specific to the client's ultimate goal and ` +
  `to tell the client what to do on day 1, day 2,..., day 7. ` +
  `2. Add the following motivational quote from James Clear's "Atomic Habits" to the email: "Every action you take is a vote for the person you wish to become." ` +
  `3. Add a small number of emojis to make the email more engaging. ` +
  `4. Do not address the client by name in the email because that information is not available. ` +
  `5. Always write "eras" in lowercase and bold in the email. ` +
  `6. Return your response as HTML.`;

export const TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST = new PromptTemplate({
  template:
    '{premise}\nWeek 1:\n###{internal_data}###\nClient\'s Ultimate Goal:\n"""\n{external_data}\n"""',
  inputVariables: [
    "premise",
    "internal_data",
    "external_data",
  ],
});

export const PLAN_SCHEMA_NAME = "get_plan";

export const PLAN_SCHEMA: ChatCompletionFunctions = {
  name: PLAN_SCHEMA_NAME,
  description: "Get a plan for the user.",
  parameters: {
    type: "object",
    required: ["text", "goal", "steps"],
    additionalProperties: false,
    properties: {
      text: {
        type: "string",
        description:
          "An empathetic message describing the changes made to the user's plan. Max. 3 sentences.",
      },
      goal: {
        type: "string",
        description:
          "The specific, measurable, achievable, relevant, and time-bound goal of the plan that starts with a verb.",
      },
      steps: {
        type: "array",
        description: "The steps of the plan",
        items: {
          type: "object",
          required: ["number", "action"],
          additionalProperties: false,
          properties: {
            number: {
              type: "number",
              description: "The number of the step.",
            },
            action: {
              type: "object",
              required: ["name", "description", "ideas"],
              additionalProperties: false,
              properties: {
                name: {
                  type: "string",
                  description: "The name of the action.",
                },
                description: {
                  type: "string",
                  description:
                    "An AI message to the user that describes the action and how it helps achieve the goal. This should be specific, measurable, achievable, relevant, and time-bound. Max 2 sentences.",
                },
                rawLinks: {
                  type: "array",
                  description:
                    "Links to relevant resources from the context delimited by brackets - \( and \). Max. 3 links. These are real sites. Do not make up URLs. Only use unique links from context.",
                  items: {
                    type: "string",
                  },
                },
                ideas: {
                  type: "object",
                  properties: {
                    mostObvious: {
                      type: "string",
                      description:
                        "An AI message to the user that describes the most obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence.",
                    },
                    leastObvious: {
                      type: "string",
                      description:
                        "An AI message to the user that describes the least obvious way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence. Add links to relevant resources from the context.",
                    },
                    inventiveOrImaginative: {
                      type: "string",
                      description:
                        "An AI message to the user that describes the most inventive or imaginative way for the user to execute this step of this plan, tailored to their goal. Max. 1 sentence. Add links to relevant resources from the context.",
                    },
                    rewardingOrSustainable: {
                      type: "string",
                      description:
                        "An AI message to the user that describes the most rewarding or sustainable way for the user to execute this step of this plan, tailored to their goal. Do not suggest credit cards. Max. 1 sentence.Add links to relevant resources from the context.",
                    },
                  },
                  required: [
                    "mostObvious",
                    "leastObvious",
                    "inventiveOrImaginative",
                    "rewardingOrSustainable",
                  ],
                  additionalProperties: false,
                },
              },
            },
          },
        },
      },
    },
  },
};
