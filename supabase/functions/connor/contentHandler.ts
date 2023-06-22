import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase.ts";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ConnorRequest } from "./connor.ts";

export type ContentRow = Database["public"]["Tables"]["content"]["Row"];

export interface InsertResponse {
  error?: PostgrestError | string;
  data?: null;
}

async function handleRequest(
  model: OpenAIEmbeddings,
  supabaseClient: SupabaseClient<Database>,
  contentRequest: ConnorRequest,
): Promise<InsertResponse> {
  try {
    const { data } = await scrapeAndSaveLink(supabaseClient, contentRequest);
    console.log("Content saved: ", data);

    // Generate an embedding for the saved content
    const response = generateEmbeddings(supabaseClient, model, data[0]?.id);
    console.log("Embedding generated");
    return response;
  } catch (error) {
    console.error("Error saving content:", error);
    throw error;
  }
}

async function scrapeAndSaveLink(
  supabaseClient: SupabaseClient<Database>,
  contentRequest: ConnorRequest,
): Promise<Record<"data", ContentRow[]>> {
  // Fetch the webpage
  const { url, userId } = contentRequest;
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

async function generateEmbeddings(
  supabaseClient: SupabaseClient<Database>,
  model: OpenAIEmbeddings,
  contentId: number,
): Promise<InsertResponse> {
  console.log("Generating embeddings");

  // Fetch the specific content from the database
  console.log("contentId??: ", contentId);
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

// _internals are used for testing
export const _internals = {
  handleRequest,
  scrapeAndSaveLink,
  generateEmbeddings,
};
