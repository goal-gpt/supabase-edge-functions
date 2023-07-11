import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Json } from "../../types/supabase.ts";

import {
  // createPlan,
  // deletePlan,
  // getAllPlans,
  // getPlan,
  // getUser,
  // updatePlan,
  _internals as _supabaseClientInternals,
} from "../_shared/supabaseClient.ts";

async function handlePlanRequest(
  supabaseClient: SupabaseClient<Database>,
  request: Request,
  resourceID?: string,
): Promise<Json> {
  const { method } = request;
  console.log("Handling plan method: ", method);
  try {
    // TODO: commented out code is all related to having user sessions
    // const token = request.headers.get("Authorization")?.split(" ")[1];
    // console.log("Token: ", token);
    // const user = await getUser(supabaseClient, token);
    // if (!user) throw new Error("User not found");

    let plan = null;
    if (method === "POST" || method === "PUT") {
      plan = await request.json();
    }

    switch (true) {
      case resourceID && method === "GET":
        return await _supabaseClientInternals.getPlan(
          supabaseClient,
          resourceID as string,
        );
      case resourceID && method === "PUT":
        return await _supabaseClientInternals.updatePlan(
          supabaseClient,
          resourceID as string,
          plan,
        );
      case resourceID && method === "DELETE":
        return await _supabaseClientInternals.deletePlan(
          supabaseClient,
          resourceID as string,
        );
      case method === "POST":
        return await _supabaseClientInternals.createPlan(supabaseClient, plan);
      case method === "GET":
        return await _supabaseClientInternals.getAllPlans(supabaseClient);
      default:
        throw new Error("Invalid plan request");
    }
  } catch (error) {
    console.error("Error in plan request: ", error);
    throw error;
  }
}

// _internals are used for testing
export const _internals = {
  handlePlanRequest,
};
