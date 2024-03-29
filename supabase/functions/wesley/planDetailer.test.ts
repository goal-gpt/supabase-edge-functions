import { assertRejects } from "testing/asserts.ts";
import {
  _internals as _planDetailerInternals,
  MOTIVATIONAL_LINK,
  MOTIVATIONAL_QUOTE,
} from "./planDetailer.ts";
import {
  _internals as _llmInternals,
  ChatOpenAI,
  ModelsContext,
  OpenAIEmbeddings,
  RecursiveCharacterTextSplitter,
} from "../_shared/llm.ts";
import * as sinon from "sinon";
import {
  ContentItem,
  MatchDocumentsResponse,
  SupabaseClient,
} from "../_shared/supabaseClient.ts";
import { stub } from "testing/mock.ts";
import { returnsNext } from "https://deno.land/std@0.188.0/testing/mock.ts";
import { AIChatMessage } from "https://esm.sh/langchain@0.0.101/schema";
import { STRIPE_PAYMENT_LINK } from "../_shared/plan.ts";

Deno.test("handleRequest", async (t) => {
  const chatModelStubWithCall = sinon.createStubInstance(ChatOpenAI);
  const embedModelStubWithCall = sinon.createStubInstance(OpenAIEmbeddings);
  const splitterStub = sinon.createStubInstance(RecursiveCharacterTextSplitter);
  const modelsContextStub: ModelsContext = {
    chat: chatModelStubWithCall,
    embed: embedModelStubWithCall,
    splitter: splitterStub,
  };
  const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
  const messages = "I would like to improve my well-being.";
  const goal = "Improve well-being.";
  const wesleyRequest = {
    messages: messages,
    plan: {
      goal: goal,
      steps: [{
        number: 1,
        action: {
          name: "Action Name",
          description: "Action Description",
          ideas: {
            mostObvious: "mostObvious",
            leastObvious: "leastObvious",
            inventiveOrImaginative: "inventiveOrImaginative",
            rewardingOrSustainable: "rewardingOrSustainable",
          },
        },
      }],
    },
    userName: "Jane",
  };
  const coachingProgram = "Coaching Program";
  const coachingProgramPromise = new Promise<AIChatMessage>((resolve) => {
    resolve(new AIChatMessage(coachingProgram));
  });
  const plan = "Plan";
  const planPromise = new Promise<AIChatMessage>((resolve) => {
    resolve(new AIChatMessage(plan));
  });
  const contentItem: ContentItem = {
    link: "http://www.example.com",
    title: "Title",
  };
  const matchDocumentsResponse = [
    {
      id: 1,
      content: 2,
      raw_content: "raw content",
      similarity: 3,
      link: contentItem.link,
      title: contentItem.title,
    },
  ];
  const matchDocumentsResponsePromise = new Promise<MatchDocumentsResponse>(
    (resolve) => {
      resolve(matchDocumentsResponse);
    },
  );
  const weeklyEmailResendResponse = new Response(
    JSON.stringify({ id: "abc123" }),
  );
  const weeklyEmailResendResponsePromise = new Promise<Response>((resolve) => {
    resolve(weeklyEmailResendResponse);
  });

  const invalidEmailResendResponse = new Response(
    JSON.stringify({ id: "abc123" }),
  );
  const invalidEmailResendResponsePromise = new Promise<Response>((resolve) => {
    resolve(invalidEmailResendResponse);
  });

  await t.step("sends a valid weekly email", async () => {
    const htmlEmail =
      `<html>HTML Email: ${contentItem.link}${MOTIVATIONAL_QUOTE}${MOTIVATIONAL_LINK}${STRIPE_PAYMENT_LINK}</html>`;
    const htmlEmailPromise = new Promise<AIChatMessage>((resolve) => {
      resolve(new AIChatMessage(htmlEmail));
    });
    const getChatCompletionStub = stub(
      _llmInternals,
      "getChatCompletion",
      returnsNext([
        coachingProgramPromise,
        planPromise,
        htmlEmailPromise,
      ]),
    );
    const embedAndGetSimilarDocumentsStub = stub(
      _llmInternals,
      "embedAndGetSimilarDocuments",
      returnsNext([matchDocumentsResponsePromise]),
    );
    const fetchStub = stub(
      window,
      "fetch",
      returnsNext([weeklyEmailResendResponsePromise]),
    );
    await _planDetailerInternals.handleRequest(
      modelsContextStub,
      supabaseClientStub,
      wesleyRequest,
    );

    getChatCompletionStub.restore();
    embedAndGetSimilarDocumentsStub.restore();
    fetchStub.restore();
  });

  await t.step(
    "throws if it cannot create a valid weekly email after 3 tries",
    async () => {
      const invalidHtmlEmail = `HTML Email:https://randomlink.com`;
      const invalidHtmlEmailPromise = new Promise<AIChatMessage>((resolve) => {
        resolve(new AIChatMessage(invalidHtmlEmail));
      });
      const getChatCompletionStub = stub(
        _llmInternals,
        "getChatCompletion",
        returnsNext([
          coachingProgramPromise,
          planPromise,
          invalidHtmlEmailPromise,
          invalidHtmlEmailPromise,
          invalidHtmlEmailPromise,
        ]),
      );
      const embedAndGetSimilarDocumentsStub = stub(
        _llmInternals,
        "embedAndGetSimilarDocuments",
        returnsNext([matchDocumentsResponsePromise]),
      );
      const fetchStub = stub(
        window,
        "fetch",
        returnsNext([invalidEmailResendResponsePromise]),
      );

      await assertRejects(
        async () => {
          return await _planDetailerInternals.handleRequest(
            modelsContextStub,
            supabaseClientStub,
            wesleyRequest,
          );
        },
        Error,
        "Invalid weekly email",
      );

      getChatCompletionStub.restore();
      embedAndGetSimilarDocumentsStub.restore();
      fetchStub.restore();
    },
  );
});
