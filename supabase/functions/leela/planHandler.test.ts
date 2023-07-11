import { assertEquals } from "testing/asserts.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import * as sinonImport from "sinon";
import { _internals as _planHandlerInternals } from "./planHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";

const sinon = sinonImport.createSandbox();

Deno.test("handlePlanRequest function", async (t) => {
  const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
  await t.step("gets all plans", async () => {
    const mockRequest = new Request("https://example.com", {
      method: "GET",
    });
    const mockPlan = { goal: "Test goal", id: "123-456" };
    sinon.stub(_supabaseClientInternals, "getAllPlans")
      .resolves(mockPlan);

    const response = await _planHandlerInternals.handlePlanRequest(
      supabaseClientStub,
      mockRequest,
    );

    assertEquals(response, { ...mockPlan });
  });

  await t.step("gets plan by ID", async () => {
    const mockRequest = new Request("https://example.com/123", {
      method: "GET",
    });
    const mockPlan = { goal: "Test goal", id: "123-456" };
    sinon.stub(_supabaseClientInternals, "getPlan")
      .resolves(mockPlan);

    const response = await _planHandlerInternals.handlePlanRequest(
      supabaseClientStub,
      mockRequest,
      "123",
    );

    assertEquals(response, { ...mockPlan });
  });

  await t.step("deletes plan by ID", async () => {
    const mockRequest = new Request("https://example.com/123", {
      method: "DELETE",
    });
    const mockPlan = { goal: "Test goal", id: "123-456" };
    sinon.stub(_supabaseClientInternals, "deletePlan")
      .resolves(mockPlan);

    const response = await _planHandlerInternals.handlePlanRequest(
      supabaseClientStub,
      mockRequest,
      "123",
    );

    assertEquals(response, { ...mockPlan });
  });

  await t.step("updates plan by ID", async () => {
    const mockRequest = new Request("https://example.com/leela/plans/123", {
      body: JSON.stringify({ goal: "Test goal!" }),
      method: "PUT",
    });
    const mockPlan = { goal: "Test goal", id: "123-456" };
    const updatePlanStub = sinon.stub(_supabaseClientInternals, "updatePlan")
      .resolves(mockPlan);

    const response = await _planHandlerInternals.handlePlanRequest(
      supabaseClientStub,
      mockRequest,
      "123",
    );

    assertEquals(response, { ...mockPlan });
    sinon.assert.calledOnce(updatePlanStub);
    sinon.assert.calledWith(updatePlanStub, supabaseClientStub, "123", {
      goal: "Test goal!",
    });
  });

  await t.step("creates plan", async () => {
    const mockRequest = new Request("https://example.com/leela/plans", {
      body: JSON.stringify({ goal: "Test goal" }),
      method: "POST",
    });
    const mockPlan = { goal: "Test goal", id: "123-456" };
    const createPlanStub = sinon.stub(_supabaseClientInternals, "createPlan")
      .resolves(mockPlan);

    const response = await _planHandlerInternals.handlePlanRequest(
      supabaseClientStub,
      mockRequest,
    );

    assertEquals(response, { ...mockPlan });
    sinon.assert.calledOnce(createPlanStub);
    sinon.assert.calledWith(createPlanStub, supabaseClientStub, {
      goal: "Test goal",
    });
  });
});
