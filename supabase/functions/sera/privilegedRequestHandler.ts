import { SeraRequest } from "./sera.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase.ts";
import { OpenAI } from "langchain/llms/openai";

import { ZodTypeAny, z } from "zod";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import {
  StructuredOutputParser,
  OutputFixingParser,
} from "langchain/output_parsers";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BaseChatMessage, SystemChatMessage } from "langchain/schema";
import { _internals as _quarantinedRequestHandlerInternals } from "./quarantinedRequestHandler.ts";
export interface PrivilegedLLMResponse {
  intent: string[];
  background: string;
  plan: string;
}

export async function handleRequest(
  supabaseClient: SupabaseClient<Database>,
  request: SeraRequest
): Promise<PrivilegedLLMResponse> {
  const messages: BaseChatMessage[] = [];
  const { message, chat } = request;

  // TODO: Consider replacing with database function or call to database REST API
  messages.push(
    ...(await _quarantinedRequestHandlerInternals.getAllChatLines(
      supabaseClient,
      chat
    ))
  );

  // 1. Define output from agent/model
  const zodSchema: ZodTypeAny = z.object({
    summary: z.object({
      attributes: z
        .enum([
          "provides_background",
          "asks_a_personal_finance_question",
          "asks_a_non_personal_finance_question",
          "other",
        ])
        .array(),
      intent: z
        .string()
        .describe("Restates the message from the AI's perspective."),
    }),
    user_background: z
      .object({
        age: z.number().describe("The user's age"),
        location: z
          .string()
          .describe("The user's location, e.g. 'US' or 'Berlin, Germany'"),
        job: z.string().describe("The user's job"),
        citizenship: z.string().describe("The user's citizenship"),
        financial_sophistication: z
          .string()
          .describe("The user's financial sophistication"),
        risk_tolerance: z.string().describe("The user's risk tolerance"),
        dependents: z
          .string()
          .describe(
            "The user's dependents, e.g. parents they support or children they have"
          ),
        income: z.number().describe("The user's income"),
        expenses: z.number().describe("The user's expenses"),
        assets: z.number().describe("The user's assets, including savings"),
        debt: z.number().describe("The user's debt"),
        financial_interests: z
          .string()
          .describe("The user's financial interests"),
      })
      .describe(
        "The user's background, based only on the message and the chat history"
      ),
    // intentions: z
    //   .enum([
    //     "to_get_financial_questions_answered",
    //     "to_provide_information_to_make_a_financial_plan",
    //     "to_make_a_financial_plan",
    //     "to_engage_with_the_chatbot",
    //     "other",
    //   ])
    //   .array(),
    // summary: z
    //   .string()
    //   .describe(
    //     "Summarize the intent of the user's message from your perspective in light of your task and background knowledge"
    //   ),
    // }),
    // intentions: z
    //   .object({
    //     to_gather_information: z
    //       .object({
    //         present: z.boolean(),
    //         reasoning: z.string("Explain why you think this is the case"),
    //       })
    //       .describe("to gather information about personal finance"),

    //     to_make_a_plan: z
    //       .object({
    //         present: z.boolean(),
    //         reasoning: z.string("Explain why you think this is the case"),
    //       })
    //       .describe(
    //         "to make a plan to achieve a personal finance goal, including improving financial knowledge"
    //       ),
    //     to_update_an_existing_plan: z
    //       .object({
    //         present: z.boolean(),
    //         reasoning: z.string("Explain why you think this is the case"),
    //       })
    //       .describe("to update an existing plan"),
    //     to_receive_emotional_support: z
    //       .object({
    //         present: z.boolean(),
    //         reasoning: z.string("Explain why you think this is the case"),
    //       })
    //       .describe("to receive emotional support"),
    //     to_engage: z
    //       .object({
    //         present: z.boolean(),
    //         reasoning: z.string("Explain why you think this is the case"),
    //       })
    //       .describe(
    //         "to engage with the chatbot, including salutations and valedictions, and to experiment with the chatbot"
    //       ),
    //     to_give_feedback: z
    //       .object({
    //         present: z.boolean(),
    //         reasoning: z.string("Explain why you think this is the case"),
    //       })
    //       .describe("to give feedback to the chatbot"),
    //     to_outside_the_scope: z
    //       .object({
    //         present: z.boolean(),
    //         reasoning: z.string("Explain why you think this is the case"),
    //       })
    //       .describe("outside the scope of the chatbot"),
    //   })
    //   .describe("The user's intentions"),
    // summary: z.object({
    //   summary: z.string().describe("Summarize your findings of the intentions"),
    //   reasoning: z.string("Explain why you summarized the intent this way"),
    // }),
  });
  const structuredOutputParser =
    StructuredOutputParser.fromZodSchema(zodSchema);
  // const formatInstructions = structuredOutputParser.getFormatInstructions();
  // 2. Set up agent/model
  const model = new ChatOpenAI({
    openAIApiKey: Deno.env.get("OPENAI_API_KEY"),
    temperature: 0,
    modelName: "gpt-3.5-turbo",
    verbose: true,
  });

  const outputFixingParser = OutputFixingParser.fromLLM(
    model,
    structuredOutputParser
  );

  const prompt = new PromptTemplate({
    template:
      "You are an AI assistant to an online financial advisor. Given the messages, summarize the user's latest message to help the financial advisor to advise the user.\n{format_instructions}\n{messages}\n{user_message}\n\nDo not guess. If you are unsure, leave summary items blank.",
    inputVariables: ["user_message", "messages"],
    partialVariables: {
      format_instructions: outputFixingParser.getFormatInstructions(),
    },
  });

  // 3. Send request to agent/model
  const input = await prompt.format({
    user_message: message,
    messages: messages,
  });
  const response = await model.call([new SystemChatMessage(input)]);
  console.log("Response from privileged LLM:", response.text);
  // 4. Return response from agent/model

  const privilegedLLMResponse = {
    intent: [],
    background: "",
    plan: "",
  };

  return privilegedLLMResponse;
}

export const _internals = {
  handleRequest,
};
