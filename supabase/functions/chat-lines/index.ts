import { serve } from "http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

interface ChatLine {
  chat: number | null;
  message: string;
  sender: string;
}

async function getAllAIandHumanChatLinesByChatId(supabaseClient: SupabaseClient, chat: number) {
  console.log('Getting all chat lines for chat', chat);
  const { data: chatLines, error } = await supabaseClient.from('chat_line').select('*').eq('chat', chat).neq('sender', 'system');
  if (error) throw error

  return new Response(JSON.stringify({ chatLines }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

serve(async (request) => {
  console.log('Handling request', request);
  // This is needed if you're planning to invoke your function from a browser.
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(request);

    const { chat } = await request.json();

    return await getAllAIandHumanChatLinesByChatId(supabaseClient, chat);
  } catch (error) {
    console.error(error)

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})