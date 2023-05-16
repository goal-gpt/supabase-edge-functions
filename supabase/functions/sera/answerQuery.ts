import { OpenAI } from "langchain/llms/openai";
import { corsHeaders } from "../_shared/cors.ts";

export async function answerQuery(llm: OpenAI, query: string): Promise<Response> {
  try {
      const response = await llm.call(query);
  
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
