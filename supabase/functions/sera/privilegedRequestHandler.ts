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
import { SystemChatMessage } from "https://esm.sh/langchain@0.0.70/schema";

export interface PrivilegedLLMResponse {
  intent: string[];
  background: string;
  plan: string;
}

export async function handleRequest(
  request: SeraRequest
): Promise<PrivilegedLLMResponse> {
  // 1. Define output from agent/model
  const zodSchema: ZodTypeAny = z.object({
    intentions: z
      .enum([
        "to_gather_information",
        "to_provide_information",
        "to_make_a_plan",
        "to_update_an_existing_plan",
        "to_receive_emotional_support",
        "to_engage_with_the_chatbot",
        "to_give_feedback",
        "outside_your_scope",
      ])
      .array(),
    summary: z
      .string()
      .describe(
        "Summarize the intent of the user's message from your perspective in light of your task and background knowledge"
      ),
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
  /*.describe("Summary of the user's intent in sending the message")*/

  const structuredOutputParser =
    StructuredOutputParser.fromZodSchema(zodSchema);
  const formatInstructions = structuredOutputParser.getFormatInstructions();

  // 2. Set up agent/model
  const model = new ChatOpenAI({
    openAIApiKey: Deno.env.get("OPENAI_API_KEY"),
    temperature: 0,
    modelName: "gpt-3.5-turbo",
    verbose: true,
  });
  const prompt = new PromptTemplate({
    template:
      `You are an empathetic personal finance AI companion. Summarize's the intent of the user's message as best as possible. ` +
  \n{ format_instructions } \n{ message } ",
    inputVariables: ["message"],
    partialVariables: { format_instructions: formatInstructions },
  });

  // 3. Send request to agent/model
  const input = await prompt.format({
    message: request.message,
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
