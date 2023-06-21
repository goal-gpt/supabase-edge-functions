import { _internals as _supabaseClientInternals } from "../_shared/supabase-client.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "http/server.ts";

serve(async (request: Request) => {
  try {
    if (request.method === "OPTIONS") {
      console.log("Handling CORS preflight request");
      return new Response("ok", { headers: corsHeaders });
    }

    const contentRequest = await request.json();
    const responseFromContent = await handler(
      contentRequest.url,
      contentRequest.userId,
    );

    return new Response(JSON.stringify(responseFromContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handler(url: string, userId: string) {
  try {
    const { data } = await scrapeAndSaveLink(url, userId);
    console.log("Content saved: ", data);

    // Generate an embedding for the saved content
    await generateEmbeddings(data[0]?.id);
    console.log("Embedding generated");
  } catch (error) {
    console.error("Error saving content:", error);
    throw error;
  }
}

async function scrapeAndSaveLink(url: string, userId: string) {
  const supabaseClient = _supabaseClientInternals.createClient();

  // Fetch the webpage
  const res = await fetch(url);
  const html = await res.text();

  // Parse the HTML to get the title
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : "";
  // Save the content into the database
  const { data, error } = await supabaseClient
    .from("content")
    .insert([
      {
        link: url,
        title: title,
        raw_content: html,
        shareable: true,
        user_id: userId,
      },
    ])
    .select();
  console.log("data: ", data);
  console.log("error: ", error);

  if (error) {
    console.error("Error inserting data:", error);
    throw error;
  } else {
    console.log("Data inserted:", data);
    return { data };
  }
}

async function generateEmbeddings(contentId: number) {
  console.log("Generating embeddings");
  const supabaseClient = _supabaseClientInternals.createClient();
  const model = _llmInternals.getEmbeddingsOpenAI();

  // Fetch the specific content from the database
  const { data: contentData, error: contentError } = await supabaseClient
    .from("content")
    .select("raw_content")
    .eq("id", contentId)
    .single();

  if (contentError) {
    console.error("Error fetching data:", contentError);
    return { error: contentError };
  }

  if (!contentData || !contentData.raw_content) {
    console.error("No content found with the given ID:", contentId);
    return { error: `No content found with the given ID: ${contentId}` };
  }

  // Generate the embedding
  const embeddingVector = await model.embedQuery(contentData.raw_content);

  // Check if an embedding already exists for this content
  // TODO: we might not need this check if we're comfortable overriding the embeddings
  const { data: documentData } = await supabaseClient
    .from("document")
    .select("*")
    .eq("content", contentId)
    .single();

  if (documentData) {
    console.log("Embedding already exists for this content:", contentId);
    return { error: "Embedding already exists for this content" };
  }
  const embeddingString = JSON.stringify(embeddingVector);
  console.log("Embedding:", embeddingString);

  // Save the embedding into the database
  const { data: newDocumentData, error: newDocumentError } =
    await supabaseClient
      .from("document")
      .insert([
        { content: contentId, embedding: embeddingString },
      ]);

  if (newDocumentError) {
    console.error("Error inserting data:", newDocumentError);
    return { error: newDocumentError };
  } else {
    console.log("Data inserted:", newDocumentData);
    return { data: newDocumentData };
  }
}
