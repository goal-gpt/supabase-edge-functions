import { Sera, SeraRequest } from "./sera.ts";
import {
  _internals as _privilegedRequestHandlerInternals,
  PlanArtifacts,
  SeraResponse,
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
      const planArtifactsMock: PlanArtifacts = {
        seraResponse: seraResponseMock,
        userPersona: "mock user persona",
        chatLine: 1,
      };
      const planArtifactsPromiseMock = new Promise<PlanArtifacts>((resolve) => {
        resolve(planArtifactsMock);
      });
      const createClientStub = stub(_supabaseClientInternals, "createClient");
      const getChatOpenAIStub = stub(_llmInternals, "getChatOpenAI");
      const handleRequestStub = stub(
        _privilegedRequestHandlerInternals,
        "handleRequest",
        returnsNext([planArtifactsPromiseMock]),
      );

      const planArtifacts = await new Sera().handleRequest(seraRequestMock);

      assertSpyCalls(createClientStub, 1);
      assertSpyCalls(getChatOpenAIStub, 1);
      assertSpyCalls(handleRequestStub, 1);
      assert(planArtifacts.seraResponse.text === seraResponseMock.text);
      assert(planArtifacts.seraResponse.chat === seraResponseMock.chat);
    },
  );
});
