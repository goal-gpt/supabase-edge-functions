import { serve } from "http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (request: Request) => {
  try {
    const data = await request.json();
    console.log(
      "Handling request data:",
      JSON.stringify(data, null, 2),
    );

    return new Response(
      JSON.stringify("OK"),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// To invoke:
// curl -i --location --request POST 'http://localhost:50321/functions/v1/wesley' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
