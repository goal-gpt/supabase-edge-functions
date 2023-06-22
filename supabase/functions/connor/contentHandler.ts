import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase.ts";

import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ConnorRequest } from "./connor.ts";
import {
  ContentRow,
  fetchContentData,
  fetchDocumentData,
  InsertResponse,
  saveContentToDatabase,
  saveEmbeddingToDatabase,
} from "../_shared/supabase-client.ts";

async function handleRequest(
  model: OpenAIEmbeddings,
  supabaseClient: SupabaseClient<Database>,
  contentRequest: ConnorRequest,
): Promise<InsertResponse> {
  try {
    const { data } = await scrapeAndSaveLink(supabaseClient, contentRequest);
    console.log("Content saved: ", data);

    return await generateEmbeddings(
      supabaseClient,
      model,
      data[0]?.id,
    );
  } catch (error) {
    console.error("Error saving content:", error);
    throw error;
  }
}

async function scrapeAndSaveLink(
  supabaseClient: SupabaseClient<Database>,
  connorRequest: ConnorRequest,
): Promise<Record<"data", ContentRow[]>> {
  const { rawContent, shareable = true, title: requestTitle, url, userId } =
    connorRequest;
  let html = rawContent;

  if (!html) {
    const res = await fetch(url);
    html = await res.text();
  }

  const title = requestTitle || extractTitleFromHtml(html);
  const { data, error } = await saveContentToDatabase(supabaseClient, {
    url,
    title,
    rawContent: html,
    userId,
    shareable,
  });

  if (error) {
    console.error("Error inserting data:", error);
    throw error;
  } else {
    console.log("Data inserted:", data);
    return { data };
  }
}

function extractTitleFromHtml(html: string): string {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? titleMatch[1] : "";
}

async function generateEmbeddings(
  supabaseClient: SupabaseClient<Database>,
  model: OpenAIEmbeddings,
  contentId: number,
): Promise<InsertResponse> {
  console.log("Generating embeddings");
  const contentData = await fetchContentData(supabaseClient, contentId);

  if (!contentData || !contentData.raw_content) {
    console.error("No content found with the given ID:", contentId);
    throw `No content found with the given ID: ${contentId}`;
  }

  const embeddingVector = await model.embedQuery(contentData.raw_content);

  const documentData = await fetchDocumentData(supabaseClient, contentId);
  if (documentData) {
    console.log("Embedding already exists for this content:", contentId);
    throw "Embedding already exists for this content";
  }

  const embeddingString = JSON.stringify(embeddingVector);
  console.log("Embedding:", embeddingString);

  return await saveEmbeddingToDatabase(
    supabaseClient,
    contentId,
    embeddingString,
  );
}

// _internals are used for testing
export const _internals = {
  handleRequest,
  scrapeAndSaveLink,
  generateEmbeddings,
};
