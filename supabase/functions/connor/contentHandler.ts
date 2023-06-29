import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase.ts";

import { ConnorRequest } from "./connor.ts";
import {
  ContentRow,
  fetchContentData,
  fetchDocumentData,
  saveContentToDatabase,
  saveEmbeddingToDatabase,
} from "../_shared/supabaseClient.ts";
import {
  getChunkedDocuments,
  getEmbeddingString,
  ModelsContext,
} from "../_shared/llm.ts";

async function handleRequest(
  modelsContext: ModelsContext,
  supabaseClient: SupabaseClient<Database>,
  contentRequest: ConnorRequest,
): Promise<number> {
  try {
    const { data } = await scrapeAndSaveLink(supabaseClient, contentRequest);
    console.log("Content saved: ", data);

    const result = await fetchAndSaveContentChunks(
      supabaseClient,
      modelsContext,
      data[0]?.id,
    );
    console.log(`${result} embeddings saved`);
    return result;
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

async function fetchAndSaveContentChunks(
  supabaseClient: SupabaseClient<Database>,
  modelsContext: ModelsContext,
  contentId: number,
): Promise<number> {
  console.log("Generating embeddings");
  const contentData = await fetchContentData(supabaseClient, contentId);

  if (!contentData || !contentData.raw_content) {
    console.error("No content found with the given ID:", contentId);
    throw `No content found with the given ID: ${contentId}`;
  }

  const documentData = await fetchDocumentData(supabaseClient, contentId);
  if (documentData && documentData.length > 0) {
    console.log("Embeddings already exist for this content:", contentId);
    throw "Embedding already exists for this content";
  }

  const { raw_content: rawContent } = contentData;
  return await saveContentChunks(
    supabaseClient,
    modelsContext,
    contentId,
    rawContent,
  );
}

async function saveContentChunks(
  supabaseClient: SupabaseClient<Database>,
  modelsContext: ModelsContext,
  contentId: number,
  rawContent: string,
): Promise<number> {
  const chunks = await getChunkedDocuments(modelsContext.splitter, rawContent);
  let successfulCount = 0;

  for (const chunk of chunks) {
    try {
      const { pageContent } = chunk;
      const embeddingString = await getEmbeddingString(
        modelsContext.embed,
        pageContent,
      );
      const { error } = await saveEmbeddingToDatabase(
        supabaseClient,
        contentId,
        chunk,
        embeddingString,
      );

      if (error) throw error;
      successfulCount += 1;
    } catch (error) {
      console.error("Error saving chunked embedding: ", error);
      throw error;
    }
  }

  return successfulCount;
}

// _internals are used for testing
export const _internals = {
  handleRequest,
  scrapeAndSaveLink,
  fetchAndSaveContentChunks,
};
