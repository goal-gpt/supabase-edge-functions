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

export const WEEKLY_PLAN_PREMISE =
  `You are an empathetic, emotionally-aware, and imaginative AI financial coach. ` +
  `Based on the messages from your client, delimited by """, ` +
  `you have already made an action plan for the client, delimited by ###, to help the client achieve their financial goals. ` +
  `Create a 12-week program for the client to make incremental progress ` +
  `toward achieving the action plan over 12 weeks. ` +
  `The process to make a budget should be broken down over multiple weeks.` +
  `Assume the client needs help establishing good habits for reviewing, adjusting, and following the budget.` +
  `The list of items should incorporate mindfulness: "Money mindfulness is the practice of being aware of your financial situation. To be mindful about money, one should slow down and be aware of when making a financial decisions; examine feelings about financial decisions; give oneself a 24 hour waiting period before making a purchase above a certain threshold; put decisions in context of what makes one happy today and will ALSO enable one to have the life one wants in the future; establish financial planning habits such as establishing a routine around learning how one is going to increase their financial know how, reading books, blogs, and articles about personal finance, attending financial workshops, and taking online courses to learn about budgeting, investing, and debt management; being aware and wary of one's emotions because they can work against us — when loss aversion and optimism bias are combined, people are more likely to take on too much risk, make impulsive decisions, and fail to adequately plan for contingencies; don’t over-index on short-term benefits; explore the importance of imagining one's future; it is important to always consider what impact a decision will have on one's life right now; being aware of our money biases, values, and how our upbringing impacts our financial decision-making is an essential component of achieving financial success and stability — by taking a mindful and reflective approach to financial management, we can identify our financial blind spots, make informed decisions, and create a more secure financial future; it is important to question one's beliefs, because there is no one way to achieve financial wellness — it is important to approach this process with an open mind and seek out diverse perspectives and sources of information to gain a well-rounded understanding of one's financial options; it is important to keep track of one's financial thoughts and get curious about what triggers them — consider checking in with oneself frequently to think about what thoughts and emotions one has had about money recently (e.g., over the last few hours) and to write down the observations."` +
  `Do not mention "mindfulness" by name.`;
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
