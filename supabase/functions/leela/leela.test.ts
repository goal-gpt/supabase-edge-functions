import { assertEquals, assertRejects } from "testing/asserts.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { Leela } from "./leela.ts";
import { _internals as _planInternals } from "./planHandler.ts";
import * as sinonImport from "sinon";
import { SupabaseClient } from "@supabase/supabase-js";

const sinon = sinonImport.createSandbox();

Deno.test("contentHandler", async (t) => {
  const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
  await t.step(
    "should call dependencies with correct arguments and return expected result",
    async () => {
      const createClientStub = sinon.stub(
        _supabaseClientInternals,
        "createClient",
      );
      createClientStub.returns(supabaseClientStub);
      const planHandlerStub = sinon.stub(
        _planInternals,
        "handlePlanRequest",
      );
      planHandlerStub.returns(Promise.resolve(1));
      const url = "https://test.com/leela/plans";
      const requestMock = new Request(url);

      await new Leela().handleRequest(requestMock);

      assertEquals(createClientStub.callCount, 1);
      assertEquals(planHandlerStub.callCount, 1);
      assertEquals(planHandlerStub.args[0], [
        supabaseClientStub,
        requestMock,
        "",
      ]);
      sinon.restore();
      sinon.reset();
    },
  );

  await t.step("should correctly set resourceID", async () => {
    const url = "https://test.com/leela/plans/123";
    const requestMock = new Request(url);
    const createClientStub = sinon.stub(
      _supabaseClientInternals,
      "createClient",
    );
    createClientStub.returns(supabaseClientStub);
    const planHandlerStub = sinon.stub(
      _planInternals,
      "handlePlanRequest",
    );
    planHandlerStub.returns(Promise.resolve(1));

    await new Leela().handleRequest(requestMock);

    assertEquals(createClientStub.callCount, 1);
    assertEquals(planHandlerStub.callCount, 1);
    assertEquals(planHandlerStub.args[0], [
      supabaseClientStub,
      requestMock,
      "123",
    ]);
    sinon.restore();
  });

  await t.step("should throw error if resource is unknown", async () => {
    const url = "https://test.com/leela/unknown";
    const requestMock = new Request(url);
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
  });
});
