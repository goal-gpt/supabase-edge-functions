import { assertEquals, assertRejects } from "testing/asserts.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { Leela } from "./leela.ts";
import { _internals as _planInternals } from "./planHandler.ts";
import * as sinon from "sinon";
import { SupabaseClient } from "@supabase/supabase-js";

Deno.test("contentHandler", async (t) => {
  await t.step(
    "should call dependencies with correct arguments and return expected result",
    async () => {
      const url = "https://test.com/leela/plans";
      const requestMock = new Request(url);
      const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
      const createClientStub = sinon.stub(
        _supabaseClientInternals,
        "createClient",
      );
      createClientStub.returns(supabaseClientStub);
      const handlerStub = sinon.stub(
        _planInternals,
        "handlePlanRequest",
      );
      handlerStub.returns(Promise.resolve(1));

      await new Leela().handleRequest(requestMock);

      assertEquals(createClientStub.callCount, 1);
      assertEquals(handlerStub.callCount, 1);
      assertEquals(handlerStub.args[0], [
        supabaseClientStub,
        requestMock,
      ]);
      sinon.restore();
      sinon.reset();
    },
  );

  await t.step("should throw error if resource is unknown", async () => {
    const url = "https://test.com/leela/unknown";
    const requestMock = new Request(url);
    const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
    const createClientStub = sinon.stub(
      _supabaseClientInternals,
      "createClient",
    );
    createClientStub.returns(supabaseClientStub);

    const leela = new Leela();

    await assertRejects(
      async () => {
        await leela.handleRequest(requestMock);
      },
      Error,
      "Unknown resource: unknown",
    );

    sinon.restore();
    sinon.reset();
  });
});
