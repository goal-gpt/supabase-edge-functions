import { assertSpyCalls, returnsNext, stub } from "testing/mock.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { Connor, ConnorRequest } from "./connor.ts";
import { _internals as _contentInternals } from "./contentHandler.ts";
import * as sinon from "sinon";

Deno.test("contentHandler", async (t) => {
  await t.step(
    "should call dependencies with correct arguments and return expected result",
    async () => {
      const url = "https://google.com";
      const userId = "testUserId";
      const requestMock: ConnorRequest = {
        url: url,
        userId: userId,
      };

      const createClientStub = stub(_supabaseClientInternals, "createClient");
      const getChatOpenAIStub = stub(_llmInternals, "getChatOpenAI");
      const getEmbeddingsOpenAIStub = stub(
        _llmInternals,
        "getEmbeddingsOpenAI",
      );
      const getSplitterStub = stub(_llmInternals, "getTextSplitter");
      const handlerStub = stub(
        _contentInternals,
        "handleRequest",
        returnsNext([Promise.resolve()]),
      );

      await new Connor().handleRequest(requestMock);

      assertSpyCalls(createClientStub, 1);
      assertSpyCalls(getEmbeddingsOpenAIStub, 1);
      assertSpyCalls(getChatOpenAIStub, 1);
      assertSpyCalls(handlerStub, 1);
      assertSpyCalls(getSplitterStub, 1);

      sinon.restore();
    },
  );
});
