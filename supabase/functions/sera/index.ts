import { serve } from "http/server.ts";
import { answerQuery } from "./answerQuery.ts";
import { OpenAI } from "langchain/llms/openai";

serve(async (request: Request) => {
  const { query } = await request.json()

  const llm = new OpenAI({
    temperature: 0,
    modelName: "gpt-3.5-turbo",
    verbose: true,
  });

  return await answerQuery(llm, query);
});
