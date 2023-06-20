import { _internals as _supabaseClientInternals } from "../_shared/supabase-client.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

async function scrapeAndSaveLink(url: string, userId: string) {
  const supabaseClient = _supabaseClientInternals.createClient();

  // Fetch the webpage
  const res = await fetch(url);
  const html = await res.text();

  // Parse the HTML to get the title
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc?.querySelector("title")?.textContent || "";

  // Save the content into the database
  const { data, error } = await supabaseClient
    .from("content")
    .insert([
      { link: url, title: title, raw_content: html, user_id: userId },
    ]);

  if (error) {
    console.error("Error inserting data:", error);
    return;
  } else {
    console.log("Data inserted:", data);
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
  const embedding = await model.embedQuery(contentData.raw_content);

  // Check if an embedding already exists for this content
  const { data: documentData, error: documentError } = await supabaseClient
    .from("document")
    .select("*")
    .eq("content", contentId)
    .single();

  if (documentError) {
    console.error("Error fetching document:", documentError);
    return { error: documentError };
  }

  if (documentData) {
    console.log("Embedding already exists for this content:", contentId);
    return { error: "Embedding already exists for this content" };
  }

  // Save the embedding into the database
  const { data: newDocumentData, error: newDocumentError } =
    await supabaseClient
      .from("document")
      .insert([
        { content: contentId, embedding: embedding },
      ]);

  if (newDocumentError) {
    console.error("Error inserting data:", newDocumentError);
    return { error: newDocumentError };
  } else {
    console.log("Data inserted:", newDocumentData);
    return { data: newDocumentData };
  }
}

// async function generateEmbeddings() {
//   console.log("Generating embeddings");
//   const supabaseClient = _supabaseClientInternals.createClient();
//   const model = _llmInternals.getChatOpenAI();

// const configuration = new Configuration({ apiKey: '<YOUR_OPENAI_KEY>' })
// const openAi = new OpenAIApi(configuration)

// const documents = await getDocuments() // Your custom function to load docs

// // Assuming each document is a string
// for (const document of documents) {
//   // OpenAI recommends replacing newlines with spaces for best results
//   const input = document.replace(/\n/g, ' ')

//   const embeddingResponse = await openai.createEmbedding({
//     model: 'text-embedding-ada-002',
//     input,
//   })

//   const [{ embedding }] = embeddingResponse.data.data

//   // In production we should handle possible errors
//   await supabaseClient.from('documents').insert({
//     content: document,
//     embedding,
//   })
// }
// }
