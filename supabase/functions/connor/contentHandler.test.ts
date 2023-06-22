import { assertEquals } from "testing/asserts.ts";
import {
  assertSpyCallArgs,
  assertSpyCalls,
  returnsNext,
  stub,
} from "testing/mock.ts";
import {
  _internals as _supabaseClientInternals,
  ContentRow,
} from "../_shared/supabase-client.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { _internals as _contentInternals } from "./contentHandler.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import * as sinonImport from "sinon";
import { ConnorRequest } from "./connor.ts";

const sinon = sinonImport.createSandbox();

Deno.test("scrapeAndSaveLink function", async (t) => {
  const html = "<title>Test Title</title>";
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
        raw_content: html,
        shareable: true,
        user_id: userId,
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
      },
    ]);
    // TODO: fetchStub was really janky to get to work, figure out a better way
    assertEquals(fetchStub.calls.length, 0);
    assertEquals(response, { data: [{ id: contentId } as ContentRow] });
    sinon.restore();
  });
});

Deno.test("generateEmbeddings function", async () => {
  const contentId = 1;
  const raw_content = "Test Content";
  const embeddingVector = [1, 2, 3];
  const embeddingString = JSON.stringify(embeddingVector);
  const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
  const modelStub = sinon.createStubInstance(_llmInternals.OpenAIEmbeddings);
  const fromStub = sinon.stub();
  const selectStub = sinon.stub();
  const insertStub = sinon.stub();
  const equalStub = sinon.stub();
  const singleStub = sinon.stub();

  modelStub.embedQuery.returns(Promise.resolve(embeddingVector));
  supabaseClientStub.from = fromStub;
  fromStub.onFirstCall().returns({ select: selectStub });
  fromStub.onSecondCall().returns({ select: selectStub });
  fromStub.onThirdCall().returns({ insert: insertStub });
  selectStub.returns({ eq: equalStub });
  equalStub.returns({ single: singleStub });
  singleStub.onCall(0).resolves({ data: { raw_content }, error: null });
  singleStub.onCall(1).resolves({ data: null });
  insertStub.resolves({ data: null, error: null });

  const response = await _contentInternals.generateEmbeddings(
    supabaseClientStub,
    modelStub,
    contentId,
  );

  sinon.assert.calledOnce(modelStub.embedQuery);
  sinon.assert.calledWith(modelStub.embedQuery, raw_content);
  sinon.assert.calledThrice(supabaseClientStub.from);
  sinon.assert.calledWith(supabaseClientStub.from.firstCall, "content");
  sinon.assert.calledWith(supabaseClientStub.from.secondCall, "document");
  sinon.assert.calledTwice(selectStub);
  sinon.assert.calledWith(selectStub.firstCall, "raw_content");
  sinon.assert.calledWith(selectStub.secondCall, "*");
  sinon.assert.calledTwice(equalStub);
  sinon.assert.calledTwice(singleStub);
  sinon.assert.calledWith(equalStub.firstCall, "id", contentId);
  sinon.assert.calledWith(equalStub.secondCall, "content", contentId);
  sinon.assert.calledOnce(insertStub);
  sinon.assert.calledWith(insertStub, [
    { content: contentId, embedding: embeddingString },
  ]);
  assertEquals(response, { data: null });

  sinon.restore();
});
