import { ChatCompletionFunctions } from "../../types/openai.ts";

// This type obeys the schema defined in GetPlanSchema
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
  `Make use of context_documents, delimited by ###, to add information and links into the answers you provide whenever possible. ` +
  `Quotations from context_documents should be used to substantiate your claims as long as they are cited. ` +
  `Here is an example citation: Individuals should establish a household budget to understand their cash flow (Source: [Household budgeting](https://www.bogleheads.org/wiki/Household_budgeting)). ` +
  `Your task is to make a plan for the user that helps them resolve their financial concerns or achieve their financial goals, ` +
  `based on the messages between you and the user, delimited by """. ` +
  `If you cannot determine the user's financial concerns or goals based on the messages, ` +
  `respond with a plan to reduce the costs or increase the earnings from buying, selling, visiting, using, or achieving the subject of the user's messages. ` +
  `Unless you know otherwise, assume the user is also concerned ` +
  `with inflation, has very little savings, has very little experience budgeting, is open to ` +
  `new or additional jobs, and is open to online learning.` +
  `The plan should be thorough, imaginative, and consist of small steps. Add sources from context_documents where possible. ` +
  `The plan should not include steps the user has already taken. ` +
  `If you have already made a plan, use information in the messages to update the plan, including the numbering of the steps, if sensible. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not make up an answer. ` +
  `Never say that you are providing "advice".`;

export const ACTION_PREMISE =
  `You are a robot with a single task: to replace words in a description with links. ` +
  `Replace words in the description, delimited by """, with the links in the context, delimited by ###, so users can learn more by clicking on the links in the description. ` +
  `Do not change the description or add to its length. Just add links. If no links make sense, return the original description and add the most relevant link at the end. ` +
  `The link format is [title](url). These are real links. Do not make up links.`;

export const GetPlanSchema: ChatCompletionFunctions = {
  name: "get_plan",
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
