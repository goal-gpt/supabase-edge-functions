import { assertEquals, assertRejects } from "testing/asserts.ts";
import {
  assertSpyCallArgs,
  assertSpyCalls,
  returnsNext,
  stub,
} from "testing/mock.ts";
import {
  _internals as _supabaseClientInternals,
  ContentRow,
} from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { _internals as _contentInternals } from "./contentHandler.ts";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { SupabaseClient } from "@supabase/supabase-js";
import * as sinonImport from "sinon";
import { ConnorRequest } from "./connor.ts";

const sinon = sinonImport.createSandbox();

Deno.test("scrapeAndSaveLink function", async (t) => {
  const html =
    "<html><head><title>Test Title</title></head><body>Here is some guidance.<script>Test script text</script><noscript>Test noscript text</noscript><style>Test style text</style></body></html>";
  await t.step("scrapes and saves content with link input", async () => {
    const textStub = stub(
      Response.prototype,
      "text",
      returnsNext([Promise.resolve(html)]),
    );
    const fetchStub = stub(
      window,
      "fetch",
      returnsNext([Promise.resolve(new Response(html))]),
    );
    const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
    const url = "https://example.com";
    const userId = "testUserId";
    const contentId = 1;
    const requestMock: ConnorRequest = {
      url: url,
      userId: userId,
    };
    const title = "Test Title";
    const selectStub = sinon.stub().returns(
      Promise.resolve({ data: [{ id: contentId }] }),
    );
    const insertStub = sinon.stub().returns({ select: selectStub });
    supabaseClientStub.from.returns({ insert: insertStub });

    const response = await _contentInternals.scrapeAndSaveLink(
      supabaseClientStub,
      requestMock,
    );

    assertSpyCalls(fetchStub, 1);
    assertSpyCallArgs(fetchStub, 0, [url]);
    assertSpyCalls(textStub, 1);
    assertSpyCallArgs(textStub, 0, []);
    sinon.assert.calledOnce(supabaseClientStub.from);
    sinon.assert.calledWith(supabaseClientStub.from, "content");
    sinon.assert.calledOnce(selectStub);
    sinon.assert.calledOnce(insertStub);
    sinon.assert.calledWith(insertStub, [
      {
        link: url,
        title: title,
        raw_content: "Here is some guidance.",
        shareable: true,
        user_id: userId,
        affiliate: false,
      },
    ]);
    assertEquals(response, { data: [{ id: contentId } as ContentRow] });
    assertEquals(fetchStub.calls.length, 1);
    sinon.restore();
    fetchStub.restore();
    textStub.restore();
  });

  await t.step("saves content with specified input", async () => {
    const fetchStub = stub(
      window,
      "fetch",
      returnsNext([Promise.resolve(new Response(html))]),
    );
    const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
    const url = "https://example.com";
    const userId = "testUserId";
    const contentId = 1;
    const rawContent = "Test Content";
    const title = "Test Title";
    const requestMock: ConnorRequest = {
      url: url,
      userId: userId,
      rawContent: rawContent,
      shareable: false,
      title: title,
    };
    const selectStub = sinon.stub().returns(
      Promise.resolve({ data: [{ id: contentId }] }),
    );
    const insertStub = sinon.stub().returns({ select: selectStub });
    supabaseClientStub.from.returns({ insert: insertStub });

    const response = await _contentInternals.scrapeAndSaveLink(
      supabaseClientStub,
      requestMock,
    );

    sinon.assert.calledOnce(supabaseClientStub.from);
    sinon.assert.calledWith(supabaseClientStub.from, "content");
    sinon.assert.calledOnce(selectStub);
    sinon.assert.calledOnce(insertStub);
    sinon.assert.calledWith(insertStub, [
      {
        link: url,
        title: title,
        raw_content: rawContent,
        shareable: false,
        user_id: userId,
        affiliate: false,
      },
    ]);
    // TODO: fetchStub was really janky to get to work, figure out a better way
    assertEquals(fetchStub.calls.length, 0);
    assertEquals(response, { data: [{ id: contentId } as ContentRow] });
    sinon.restore();
    fetchStub.restore();
  });

  await t.step("saves content with affiliate input", async () => {
    const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
    const url = "https://example.com";
    const userId = "testUserId";
    const contentId = 1;
    const rawContent = "Test Content";
    const title = "Test Title";
    const requestMock: ConnorRequest = {
      url: url,
      userId: userId,
      rawContent: rawContent,
      shareable: false,
      title: title,
      affiliate: true,
    };
    const selectStub = sinon.stub().returns(
      Promise.resolve({ data: [{ id: contentId }] }),
    );
    const insertStub = sinon.stub().returns({ select: selectStub });
    supabaseClientStub.from.returns({ insert: insertStub });

    await _contentInternals.scrapeAndSaveLink(
      supabaseClientStub,
      requestMock,
    );

    sinon.assert.calledWith(insertStub, [
      {
        link: url,
        title: title,
        raw_content: rawContent,
        shareable: false,
        user_id: userId,
        affiliate: true,
      },
    ]);
  });

  await t.step("does not save when body is empty", async () => {
    const fetchStub = stub(
      window,
      "fetch",
      returnsNext([Promise.resolve(new Response(""))]),
    );
    const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
    const url = "https://example.com";
    const userId = "testUserId";
    const contentId = 1;
    const rawContent = "";
    const title = "Test Title";
    const requestMock: ConnorRequest = {
      url: url,
      userId: userId,
      rawContent: rawContent,
      shareable: false,
      title: title,
      affiliate: true,
    };
    const selectStub = sinon.stub().returns(
      Promise.resolve({ data: [{ id: contentId }] }),
    );
    const insertStub = sinon.stub().returns({ select: selectStub });
    supabaseClientStub.from.returns({ insert: insertStub });

    await assertRejects(
      async () => {
        return await _contentInternals.scrapeAndSaveLink(
          supabaseClientStub,
          requestMock,
        );
      },
      Error,
      "Scraped body is empty",
    );
    fetchStub.restore();
  });
});

Deno.test("fetchAndSaveContentChunks function", async () => {
  const contentId = 1;
  const raw_content = "Test Content";
  const embeddingVector = [1, 2, 3];
  const embeddingString = JSON.stringify(embeddingVector);
  const embedModelStubWithCall = sinon.createStubInstance(OpenAIEmbeddings);
  embedModelStubWithCall.embedQuery.returns(Promise.resolve(embeddingVector));
  const chatModelStubWithCall = sinon.createStubInstance(ChatOpenAI);
  const splitterStub = sinon.createStubInstance(
    RecursiveCharacterTextSplitter,
    {
      createDocuments: Promise.resolve([{
        pageContent: "Test",
        metadata: { loc: { lines: { from: 1, to: 2 } } },
      }, {
        pageContent: "Content",
        metadata: { loc: { lines: { from: 2, to: 3 } } },
      }]),
    },
  );
  const modelsContextStub = {
    chat: chatModelStubWithCall,
    embed: embedModelStubWithCall,
    splitter: splitterStub,
  };
  const fromStub = sinon.stub();
  const selectStub = sinon.stub();
  const insertStub = sinon.stub();
  const equalStub = sinon.stub();
  const singleStub = sinon.stub();
  const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
  supabaseClientStub.from = fromStub;
  fromStub.onCall(0).returns({ select: selectStub });
  fromStub.onCall(1).returns({ select: selectStub });
  fromStub.onCall(2).returns({ insert: insertStub });
  fromStub.onCall(3).returns({ insert: insertStub });
  selectStub.returns({ eq: equalStub });
  equalStub.returns({ single: singleStub });
  singleStub.onCall(0).resolves({ data: { raw_content }, error: null });
  singleStub.onCall(1).resolves({ data: null });
  insertStub.resolves({ data: null, error: null });

  const response = await _contentInternals.fetchAndSaveContentChunks(
    supabaseClientStub,
    modelsContextStub,
    contentId,
  );

  sinon.assert.calledTwice(embedModelStubWithCall.embedQuery);
  sinon.assert.calledWith(embedModelStubWithCall.embedQuery.firstCall, "Test");
  sinon.assert.calledWith(
    embedModelStubWithCall.embedQuery.secondCall,
    "Content",
  );
  assertEquals(supabaseClientStub.from.callCount, 4);
  sinon.assert.calledWith(supabaseClientStub.from.firstCall, "content");
  sinon.assert.calledWith(supabaseClientStub.from.secondCall, "document");
  sinon.assert.calledTwice(selectStub);
  sinon.assert.calledWith(selectStub.firstCall, "raw_content");
  sinon.assert.calledWith(selectStub.secondCall, "*");
  sinon.assert.calledTwice(equalStub);
  sinon.assert.calledOnce(singleStub);
  sinon.assert.calledWith(equalStub.firstCall, "id", contentId);
  sinon.assert.calledWith(equalStub.secondCall, "content", contentId);
  sinon.assert.calledTwice(insertStub);
  sinon.assert.calledWith(insertStub.firstCall, [
    {
      content: contentId,
      embedding: embeddingString,
      raw_content: "Test",
      start_line: 1,
      end_line: 2,
    },
  ]);
  sinon.assert.calledWith(insertStub.secondCall, [
    {
      content: contentId,
      embedding: embeddingString,
      raw_content: "Content",
      start_line: 2,
      end_line: 3,
    },
  ]);
  assertEquals(response, 2);

  sinon.restore();
});
