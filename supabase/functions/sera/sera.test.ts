import { Sera, SeraRequest, SeraResponse } from "./sera.ts";
import {
  _internals as _privilegedRequestHandlerInternals,
} from "./privilegedRequestHandler.ts";
import { assert } from "testing/asserts.ts";
import { assertSpyCalls, returnsNext, stub } from "testing/mock.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";

Deno.test("sera", async (t) => {
  await t.step(
    "should call dependencies with correct arguments and return expected result",
    async () => {
      const seraRequestMock: SeraRequest = {
        message: "test",
        chat: 1,
      };

      const seraResponseMock: SeraResponse = {
        text: "How may I assist you?",
        chat: seraRequestMock.chat!,
      };
      const seraResponsePromiseMock = new Promise<SeraResponse>((resolve) => {
        resolve(seraResponseMock);
      });
      const createClientStub = stub(_supabaseClientInternals, "createClient");
      const getChatOpenAIStub = stub(_llmInternals, "getChatOpenAI");
      const getEmbeddingsOpenAIStub = stub(
        _llmInternals,
        "getEmbeddingsOpenAI",
      );
      const getSplitterStub = stub(_llmInternals, "getTextSplitter");
      const handleRequestStub = stub(
        _privilegedRequestHandlerInternals,
        "handleRequest",
        returnsNext([seraResponsePromiseMock]),
      );

      const seraResponse = await new Sera().handleRequest(seraRequestMock);

      assertSpyCalls(createClientStub, 1);
      assertSpyCalls(getChatOpenAIStub, 1);
      assertSpyCalls(handleRequestStub, 1);
      assertSpyCalls(getSplitterStub, 1);
      assertSpyCalls(getEmbeddingsOpenAIStub, 1);
      assert(seraResponse.text === seraResponseMock.text);
      assert(seraResponse.chat === seraResponseMock.chat);
    },
  );
});
