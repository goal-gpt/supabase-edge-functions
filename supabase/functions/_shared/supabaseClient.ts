import {
  AIChatMessage,
  BaseChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";
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

async function getAllChatLines(
  supabaseClient: SupabaseClient<Database>,
  chat: number,
): Promise<BaseChatMessage[]> {
  console.log("Getting all chat lines", chat);
  const { data, error } = await supabaseClient
    .from("chat_line")
    .select("*")
    .eq("chat", chat);
  if (error) throw error;

  const messages: BaseChatMessage[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i].message) {
      switch (data[i].sender) {
        case "ai":
          messages.push(new AIChatMessage(data[i].message!));
          break;
        case "human":
          messages.push(new HumanChatMessage(data[i].message!));
          break;
        case "system":
          messages.push(new SystemChatMessage(data[i].message!));
          break;
        case "function":
          // TODO: implement something here but, for now, we don't want to return multiple function messages
          break;
        default:
          throw new Error("Invalid chat line sender");
      }
    }
  }

  return messages;
}

async function createChatLine(
  supabaseClient: SupabaseClient<Database>,
  message: BaseChatMessage,
  chat: number,
): Promise<number> {
  console.log("Creating chat line", message.text, chat);

  const { data, error } = await supabaseClient
    .from("chat_line")
    .insert({ chat: chat, message: message.text, sender: message._getType() })
    .select();

  if (error) throw error;

  const { id } = data[0];

  return id;
}

async function updateChatLineMessage(
  supabaseClient: SupabaseClient<Database>,
  chatLine: number,
  messageText: string,
) {
  console.log("Updating chat line", chatLine, messageText);

  const { error } = await supabaseClient
    .from("chat_line")
    .update({ message: messageText })
    .eq("id", chatLine)
    .select();

  if (error) throw error;
}

async function createChat(
  supabaseClient: SupabaseClient<Database>,
): Promise<number> {
  console.log("Creating chat");
  const { data, error } = await supabaseClient.from("chat").insert({}).select();
  if (error) throw error;

  const chat = data[0].id;

  return chat;
}

// _internals are used for testing
export const _internals = {
  createClient,
  createChat,
  createChatLine,
  getAllChatLines,
  getSimilarDocuments,
  updateChatLineMessage,
};

// Re-export types for convenience
export { SupabaseClient };
