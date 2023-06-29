import {
  createClient as createSupabaseClient,
  PostgrestError,
  SupabaseClient,
} from "@supabase/supabase-js";
import { Document } from "./llm.ts";
import { Database } from "../../types/supabase.ts";

export function createClient() {
  return createSupabaseClient<Database>(
    // Supabase API URL - env var exported by default.
    Deno.env.get("SUPABASE_URL") ?? "",
    // Supabase API ANON KEY - env var exported by default.
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

export interface SaveContent {
  url: string;
  title: string;
  rawContent: string;
  userId: string;
  shareable: boolean;
}

export interface InsertResponse {
  error?: PostgrestError | string;
  data?: null;
}

export type MatchDocumentsResponse =
  Database["public"]["Functions"]["match_documents"]["Returns"];
export type ContentRow = Database["public"]["Tables"]["content"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["document"]["Row"];

export async function saveContentToDatabase(
  supabaseClient: SupabaseClient<Database>,
  { url, title, rawContent, userId, shareable }: SaveContent,
) {
  return await supabaseClient
    .from("content")
    .insert([
      {
        link: url,
        title: title,
        raw_content: rawContent,
        shareable: shareable,
        user_id: userId,
      },
    ])
    .select();
}

export async function fetchContentData(
  supabaseClient: SupabaseClient<Database>,
  contentId: number,
): Promise<{ raw_content: string | null }> {
  const { data: contentData, error: contentError } = await supabaseClient
    .from("content")
    .select("raw_content")
    .eq("id", contentId)
    .single();

  if (contentError) {
    console.error("Error fetching data:", contentError);
    throw contentError;
  }

  return contentData;
}

export async function fetchDocumentData(
  supabaseClient: SupabaseClient<Database>,
  contentId: number,
): Promise<DocumentRow[] | null> {
  const { data: documentData } = await supabaseClient
    .from("document")
    .select("*")
    .eq("content", contentId);

  return documentData;
}

export async function saveEmbeddingToDatabase(
  supabaseClient: SupabaseClient<Database>,
  contentId: number,
  document: Document,
  embeddingString: string,
): Promise<InsertResponse> {
  const { from, to } = document.metadata.loc.lines;
  const { data: newDocumentData, error: newDocumentError } =
    await supabaseClient
      .from("document")
      .insert([
        {
          content: contentId,
          embedding: embeddingString,
          raw_content: document.pageContent,
          start_line: from,
          end_line: to,
        },
      ]);

  if (newDocumentError) {
    console.error("Error inserting data:", newDocumentError);
    throw newDocumentError;
  }

  console.log("Data inserted:", newDocumentData);
  return { data: newDocumentData };
}

export async function getSimilarDocuments(
  supabaseClient: SupabaseClient<Database>,
  queryEmbedding: string,
  matchThreshold: number,
  matchCount: number,
): Promise<MatchDocumentsResponse> {
  const { data: documents, error: documentsError } = await supabaseClient.rpc(
    "match_documents",
    {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    },
  );

  if (documentsError) {
    console.error("Error fetching similar documents:", documentsError);
    throw documentsError;
  }

  return documents;
}

// _internals are used for testing
export const _internals = {
  createClient,
};
