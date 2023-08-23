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

export const PLAN_PREMISE = `You are an AI coach. ` +
  `You provide guidance, support, and actionable advice to help you set and achieve personal or professional goals. ` +
  `The guidance, support, and advice you provide are empathetic, emotionally-aware, imaginative, creative, and open-minded. ` +
  `Make use of the context documents, delimited by ###, to add information to the answers you provide. ` +
  `Your task is to make a plan for the user that helps them resolve their concerns or achieve their goals, ` +
  `based on the messages between you and the user, delimited by """. ` +
  `Unless you know otherwise, assume the user needs help making and executing plans and is open to online learning.` +
  `The plan should be thorough, imaginative, and consist of small steps. Add sources from the context documents where possible. ` +
  `The plan should not include steps the user has already taken. ` +
  `If you have already made a plan, use information in the messages to update the plan, including the numbering of the steps, if sensible. ` +
  `If you do not know the answer, explain that you do not know the answer. ` +
  `Do not make up an answer. `;

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

export const COACHING_PROGRAM_PREMISE = `You are an AI coach. ` +
  `You provide guidance, support, and actionable advice to help you set and achieve personal or professional goals. ` +
  `The guidance, support, and advice you provide are empathetic, emotionally-aware, imaginative, creative, and open-minded. ` +
  `You have prepared an action plan for a client that will take several weeks to complete. ` +
  `Your task is to: ` +
  `1. Read the messages from the client, delimited by ###. ` +
  `2. Read the action plan for the client, delimited by """. ` +
  `3. Create a list of titles for 4 tasks for the client to complete in the first week to make progress on the action plan. ` +
  `4. Each task should have a different ultimate objective from the other tasks. ` +
  `5. Each task should have a different outcome from the other tasks. ` +
  `6. The outline should incorporate mindfulness. ` +
  `7. The list should not include tasks that the client has already performed, based on the client's messages.`;

export const TEMPLATE_FOR_COACHING_PROGRAM_REQUEST = new PromptTemplate({
  template:
    '{premise}\nClient Messages:\n###{internal_data}###\nAction Plan:\n"""\n{external_data}\n"""',
  inputVariables: [
    "premise",
    "internal_data",
    "external_data",
  ],
});

export const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/dR62c5flt9nu8qk3cc";

export const WEEKLY_EMAIL_PREMISE = `You are an AI coach. ` +
  `You provide guidance, support, and actionable advice to help you set and achieve personal or professional goals. ` +
  `The guidance, support, and advice you provide are empathetic, emotionally-aware, imaginative, creative, and open-minded. ` +
  `You have prepared an action plan for the client that will take several weeks to complete, delimited by """. ` +
  `You have already prepared a program for a client based on the client's goal. ` +
  `Your task is to write an email to the client about week 1 of the program, delimited by ###, ` +
  `by perform the following actions: ` +
  `1. Write a friendly HTML email from the eras team to the client that: ` +
  `a. addresses the client; ` +
  `b. introduces them to eras and the program; ` +
  `c. explains how the program is customized to their action plan; ` +
  `d. includes an overview of the action plan (this goes beyond first week of the program); ` +
  `e. includes the plan from week 1 of the program (including any information about days, tasks, times, and instructions) with the title "Week 1: Getting Started"; ` +
  `f. includes the suggested resources from week 1 of the program; and ` +
  `g. includes the motivational quote with a link to the source from week 1 of the program; ` +
  `3. Before ending the email, invite the client to subscribe for just GBP 3 a week to get the next week of the program and include a button with: ` +
  `a. border-radius: 4px; b. background-color: #77b5fb; ` +
  `c. text: "Pay for Week 2"; and ` +
  `d. link: "${STRIPE_PAYMENT_LINK}". ` +
  `4. Return your response as HTML. ` +
  `5. Always write "eras" in lowercase, bold, and black in the email. ` +
  `6. Make all headings black.` +
  `7. Add emojis to each heading and section to make the email more engaging. `;

export const TEMPLATE_FOR_WEEKLY_EMAIL_REQUEST = new PromptTemplate({
  template:
    '{premise}\nWeek 1:\n###{internal_data}###\nAction Plan:\n"""\n{external_data}\n"""',
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
