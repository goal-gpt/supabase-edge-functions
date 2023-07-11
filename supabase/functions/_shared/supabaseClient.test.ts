import { assertEquals } from "testing/asserts.ts";
import {
  _internals as _supabaseClientInternals,
  PlanRow,
} from "./supabaseClient.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import * as sinonImport from "sinon";

const sinon = sinonImport.createSandbox();

Deno.test("supabaseClient", async (t) => {
  const supabaseClientStub = sinon.createStubInstance(SupabaseClient);

  await t.step("getAllPlans function", async () => {
    const mockPlan = [{ goal: "Test goal", id: "123-456" }];
    const throwOnErrorStub = sinon.stub().returns({
      data: mockPlan,
    });
    const selectStub = sinon.stub().returns({
      throwOnError: throwOnErrorStub,
    });
    const fromStub = sinon.stub().returns({ select: selectStub });
    supabaseClientStub.from = fromStub;

    const response = await _supabaseClientInternals.getAllPlans(
      supabaseClientStub,
    );

    sinon.assert.calledOnce(supabaseClientStub.from);
    sinon.assert.calledWith(supabaseClientStub.from, "plan");
    sinon.assert.calledOnce(selectStub);
    sinon.assert.calledWith(selectStub, "*");
    sinon.assert.calledOnce(throwOnErrorStub);
    assertEquals(response, [...mockPlan as PlanRow[]]);
  });

  await t.step("createPlan function", async () => {
    const mockPlan = { goal: "Test goal", id: "123-456" };
    const throwOnErrorStub = sinon.stub().returns({
      data: [mockPlan],
    });
    const insertStub = sinon.stub().returns({
      select: sinon.stub().returns({
        throwOnError: throwOnErrorStub,
      }),
    });
    const fromStub = sinon.stub().returns({ insert: insertStub });
    supabaseClientStub.from = fromStub;

    const response = await _supabaseClientInternals.createPlan(
      supabaseClientStub,
      mockPlan,
    );

    sinon.assert.calledOnce(supabaseClientStub.from);
    sinon.assert.calledWith(supabaseClientStub.from, "plans");
    sinon.assert.calledOnce(insertStub);
    sinon.assert.calledWith(insertStub, mockPlan);
    sinon.assert.calledOnce(fromStub);
    sinon.assert.calledWith(fromStub, "plans");
    sinon.assert.calledOnce(throwOnErrorStub);
    assertEquals(response, [mockPlan as PlanRow]);
  });

  await t.step("getPlan function", async () => {
    const mockPlan = { goal: "Test goal", id: "123-456" };
    const throwOnErrorStub = sinon.stub().returns({
      data: [mockPlan],
    });
    const eqStub = sinon.stub().returns(
      {
        throwOnError: throwOnErrorStub,
      },
    );
    const selectStub = sinon.stub().returns({
      eq: eqStub,
    });
    const fromStub = sinon.stub().returns({ select: selectStub });
    supabaseClientStub.from = fromStub;

    const response = await _supabaseClientInternals.getPlan(
      supabaseClientStub,
      mockPlan.id,
    );

    sinon.assert.calledOnce(supabaseClientStub.from);
    sinon.assert.calledWith(supabaseClientStub.from, "plan");
    sinon.assert.calledOnce(selectStub);
    sinon.assert.calledWith(selectStub, "*");
    sinon.assert.calledOnce(eqStub);
    sinon.assert.calledWith(eqStub, "id", mockPlan.id);
    sinon.assert.calledOnce(fromStub);
    sinon.assert.calledWith(fromStub, "plan");
    sinon.assert.calledOnce(throwOnErrorStub);
    assertEquals(response, [mockPlan as PlanRow]);
  });

  await t.step("updatePlan function", async () => {
    const mockPlan = { goal: "Test goal", id: "123-456" };
    const throwOnErrorStub = sinon.stub().returns({
      data: [mockPlan],
    });
    const selectStub = sinon.stub().returns({
      throwOnError: throwOnErrorStub,
    });
    const eqStub = sinon.stub().returns({
      select: selectStub,
    });
    const updateStub = sinon.stub().returns({
      eq: eqStub,
    });
    const fromStub = sinon.stub().returns({ update: updateStub });
    supabaseClientStub.from = fromStub;

    const response = await _supabaseClientInternals.updatePlan(
      supabaseClientStub,
      mockPlan.id,
      mockPlan,
    );

    sinon.assert.calledOnce(supabaseClientStub.from);
    sinon.assert.calledWith(supabaseClientStub.from, "plans");
    sinon.assert.calledOnce(selectStub);
    sinon.assert.calledOnce(eqStub);
    sinon.assert.calledWith(eqStub, "id", mockPlan.id);
    sinon.assert.calledOnce(updateStub);
    sinon.assert.calledWith(updateStub, mockPlan);
    sinon.assert.calledOnce(fromStub);
    sinon.assert.calledWith(fromStub, "plans");
    sinon.assert.calledOnce(throwOnErrorStub);
    assertEquals(response, [mockPlan as PlanRow]);
  });

  await t.step("deletePlan function", async () => {
    const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
    const mockPlan = { goal: "Test goal", id: "123-456" };
    const throwOnErrorStub = sinon.stub();
    const eqStub = sinon.stub().returns({
      throwOnError: throwOnErrorStub,
    });
    const deleteStub = sinon.stub().returns({
      eq: eqStub,
    });
    const fromStub = sinon.stub().returns({ delete: deleteStub });
    supabaseClientStub.from = fromStub;

    const response = await _supabaseClientInternals.deletePlan(
      supabaseClientStub,
      mockPlan.id,
    );

    sinon.assert.calledOnce(supabaseClientStub.from);
    sinon.assert.calledWith(supabaseClientStub.from, "plan");
    sinon.assert.calledOnce(deleteStub);
    sinon.assert.calledWith(deleteStub);
    sinon.assert.calledOnce(fromStub);
    sinon.assert.calledWith(fromStub, "plan");
    sinon.assert.calledOnce(eqStub);
    sinon.assert.calledWith(eqStub, "id", mockPlan.id);
    sinon.assert.calledOnce(throwOnErrorStub);
    assertEquals(response, mockPlan.id);
  });
});
