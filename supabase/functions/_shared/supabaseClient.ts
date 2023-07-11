import {
  createClient as createSupabaseClient,
  PostgrestError,
  SupabaseClient,
} from "@supabase/supabase-js";
import { Document } from "./llm.ts";
import { Database } from "../../types/supabase.ts";

export type MatchDocumentsResponse =
  Database["public"]["Functions"]["match_documents"]["Returns"];
export type ContentRow = Database["public"]["Tables"]["content"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["document"]["Row"];
export type PlanRow = Database["public"]["Tables"]["plan"]["Row"];
export type InsertContent = {
  url: string;
  title: string;
  rawContent: string;
  userId: string;
  shareable: boolean;
};
export type InsertResponse = {
  error?: PostgrestError | string;
  data?: null;
};

export type SupabaseClientType = SupabaseClient<Database>;

export function createClient() {
  return createSupabaseClient<Database>(
    // Supabase API URL - env var exported by default.
    Deno.env.get("SUPABASE_URL") ?? "",
    // Supabase API ANON KEY - env var exported by default.
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

export async function getUser(
  supabaseClient: SupabaseClient<Database>,
  token?: string,
) {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser(token);
  supabaseClient.auth;
  return user;
}

export async function saveContentToDatabase(
  supabaseClient: SupabaseClient<Database>,
  { url, title, rawContent, userId, shareable }: InsertContent,
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

export async function getPlan(
  supabaseClient: SupabaseClient<Database>,
  id: string,
): Promise<PlanRow[]> {
  const { data: plan } = await supabaseClient.from("plan").select("*")
    .eq("id", id).throwOnError();
  return plan as PlanRow[];
}

export async function getAllPlans(
  supabaseClient: SupabaseClient<Database>,
  // userID: string, // TODO: update this to use userID
): Promise<PlanRow[]> {
  const { data: plans } = await supabaseClient.from("plan").select("*")
    .throwOnError();
  return plans as PlanRow[];
}

export async function deletePlan(
  supabaseClient: SupabaseClient<Database>,
  id: string,
): Promise<string> {
  await supabaseClient.from("plan").delete().eq("id", id).throwOnError();
  return id;
}

export async function updatePlan(
  supabaseClient: SupabaseClient<Database>,
  id: string,
  plan: Partial<PlanRow>,
): Promise<PlanRow[]> {
  const { data } = await supabaseClient.from("plans").update(plan).eq(
    "id",
    id,
  ).select().throwOnError();
  return data as PlanRow[];
}

export async function createPlan(
  supabaseClient: SupabaseClient<Database>,
  plan: Partial<PlanRow>,
): Promise<PlanRow[]> {
  const { data } = await supabaseClient.from("plans").insert(plan)
    .select().throwOnError();
  return data as PlanRow[];
}

// _internals are used for testing
export const _internals = {
  createClient,
  createPlan,
  deletePlan,
  getAllPlans,
  getPlan,
  getUser,
  updatePlan,
};
