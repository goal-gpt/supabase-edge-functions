import {
  assertSpyCallArgs,
  assertSpyCalls,
  returnsNext,
  stub,
} from "testing/mock.ts";
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
      const url = "https://google.com";
      const requestMock = new Request(url, {
        method: "GET",
      });
      const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
      const createClientStub = stub(
        _supabaseClientInternals,
        "createClient",
        returnsNext([supabaseClientStub]),
      );
      const handlerStub = stub(
        _planInternals,
        "handlePlanRequest",
        returnsNext([Promise.resolve(1)]),
      );

      await new Leela().handlePlanRequest(requestMock);

      assertSpyCalls(createClientStub, 1);
      assertSpyCalls(handlerStub, 1);
      assertSpyCallArgs(handlerStub, 0, [
        supabaseClientStub,
        requestMock,
      ]);

      sinon.restore();
    },
  );
});
