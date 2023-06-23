import { assertEquals } from "testing/asserts.ts";
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
      const getEmbeddingsOpenAIStub = stub(
        _llmInternals,
        "getEmbeddingsOpenAI",
      );
      const handlerStub = stub(
        _contentInternals,
        "handleRequest",
        returnsNext([Promise.resolve({ "data": null })]),
      );

      const response = await new Connor().handleRequest(requestMock);

      assertSpyCalls(createClientStub, 1);
      assertSpyCalls(getEmbeddingsOpenAIStub, 1);
      assertSpyCalls(handlerStub, 1);
      assertEquals(response.data, null);
      assertEquals(response.error, undefined);

      sinon.restore();
    },
  );
});
