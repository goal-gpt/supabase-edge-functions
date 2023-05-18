import { serve } from "http/server.ts";
import { answerQuery } from "./answerQuery.ts";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "../_shared/supabase-client.ts";

serve(async (request: Request) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(request);

    if (request.method === "OPTIONS") {
      console.log("Handling CORS preflight request.");
      return new Response("ok", { headers: corsHeaders });
    }

    console.log("Handling request.");
    const { message, chat } = await request.json();
    const model = new ChatOpenAI({
      openAIApiKey: Deno.env.get("OPENAI_API_KEY"),
      temperature: 0,
      modelName: "gpt-3.5-turbo",
      verbose: true,
    });

    return await answerQuery(model, message, supabaseClient, chat);
  } catch (error) {
    console.error(error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
