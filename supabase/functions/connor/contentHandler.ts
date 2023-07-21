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
import * as cheerio from "cheerio";

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
  const html = rawContent ? rawContent : await getHtml(url);
  const $ = cheerio.load(html);
  const title = requestTitle || getScrapedTitle($);
  const body = getScrapedBody($);
  const { data, error } = await saveContentToDatabase(supabaseClient, {
    url,
    title,
    rawContent: body,
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

async function getHtml(url: string): Promise<string> {
  const res = await fetch(url);
  const html = await res.text();
  return html;
}

function getScrapedTitle($: cheerio.CheerioAPI): string {
  return $("title").first().text().trim() || "";
}

function getScrapedBody($: cheerio.CheerioAPI): string {
  // Remove all script, style, and noscript tags from everywhere, including the body
  const tagsToRemove = ["script", "style", "noscript", "svg", "img"];

  tagsToRemove.forEach((tag) => {
    $(tag).each((_index, item) => {
      $(item).remove();
    });
  });

  // Get the text from the body and trim whitespace
  const body = $("body").text().trim();

  // Split the input text by lines
  const lines = body.split("\n");

  // Remove whitespace from each line and filter out empty lines
  const filteredLines = lines
    .map((line) => line.trim())
    .filter((line) => line !== "");

  // Join the filtered lines with spaces instead of new lines as recommended
  const scrapedBody = filteredLines.join(" ");

  return scrapedBody;
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
