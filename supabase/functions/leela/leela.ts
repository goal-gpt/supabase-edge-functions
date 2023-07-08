import {
  _internals as _supabaseClientInternals,
  SupabaseClientType,
} from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { _internals as _planInternals } from "./planHandler.ts";
import { Json } from "../../types/supabase.ts";

export class Leela {
  async handleRequest(
    request: Request,
  ): Promise<Json> {
    const { url } = request;
    const urlPattern = new URLPattern({
      pathname: "/leela/:resource/:resourceID?",
    });
    const matchingPath = urlPattern.exec(url);
    const resource = matchingPath?.pathname.groups.resource;
    const supabaseClient = _supabaseClientInternals.createClient();

    // Switch the handler based on the 'resource' field
    switch (resource) {
      case "plans":
        return await this.handlePlanRequest(
          supabaseClient,
          request,
        );
      default:
        throw new Error(`Unknown resource: ${resource}`);
    }
  }
  async handlePlanRequest(
    supabaseClient: SupabaseClientType,
    request: Request,
  ): Promise<Json> {
    return await _planInternals.handlePlanRequest(
      supabaseClient,
      request,
    );
  }
}
