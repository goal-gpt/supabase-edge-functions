import {
  _internals as _supabaseClientInternals,
} from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { _internals as _contentHandlerInternals } from "./planHandler.ts";
import { Json } from "../../types/supabase.ts";

export class Leela {
  async handlePlanRequest(
    request: Request,
    // resourceID?: string,
  ): Promise<Json> {
    const supabaseClient = _supabaseClientInternals.createClient();

    return await _contentHandlerInternals.handlePlanRequest(
      supabaseClient,
      request,
      // resourceID,
    );
  }
}
