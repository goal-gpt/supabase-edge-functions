import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Json } from "../../types/supabase.ts";

import {
  // createPlan,
  // deletePlan,
  getAllPlans,
  // getPlan,
  // getUser,
  // updatePlan,
} from "../_shared/supabaseClient.ts";

async function handlePlanRequest(
  supabaseClient: SupabaseClient<Database>,
  request: Request,
  // resourceID?: string,
): Promise<Json> {
  const { method } = request;
  console.log("Handling plan method: ", method);
  try {
    // TODO: commented out code is all related to having user sessions
    // const token = request.headers.get("Authorization")?.split(" ")[1];
    // console.log("Token: ", token);
    // const user = await getUser(supabaseClient, token);
    // if (!user) throw new Error("User not found");

    // let plan = null;
    // if (method === "POST" || method === "PUT") {
    //   const body = await request.json();
    //   plan = body.task;
    // }

    switch (true) {
      // case resourceID && method === "GET":
      //   return getPlan(supabaseClient, resourceID as string, user.id);
      // case resourceID && method === "PUT":
      //   return updatePlan(supabaseClient, resourceID as string, leelaRequest);
      // case resourceID && method === "DELETE":
      //   return deletePlan(supabaseClient, resourceID as string);
      // case method === "POST":
      //   return createPlan(supabaseClient, plan);
      case method === "GET":
        // TODO: update this to add user ID
        return await getAllPlans(supabaseClient);
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
