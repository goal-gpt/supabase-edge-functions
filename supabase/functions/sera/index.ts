import { serve } from "http/server.ts";
import { answerQuery } from "./answerQuery.ts";
import { OpenAI } from "langchain/llms/openai";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    console.log("Handling CORS preflight request.");
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("Handling request.");
  console.log(request);
  // const { query } = await request.json()

  const llm = new OpenAI({
    temperature: 0,
    modelName: "gpt-3.5-turbo",
    verbose: true,
  });

  return await answerQuery(llm, "How do I save money?");
});
