import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RAILWAY_URL = Deno.env.get("RAILWAY_URL");
    if (!RAILWAY_URL) {
      return new Response(
        JSON.stringify({ error: "Railway server URL not configured. Please add RAILWAY_URL secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const incomingForm = await req.formData();
    const audioFile = incomingForm.get("audio") as File | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const outgoingForm = new FormData();
    outgoingForm.append("audio", audioFile, audioFile.name);

    const railwayResponse = await fetch(`${RAILWAY_URL}/transcribe`, {
      method: "POST",
      body: outgoingForm,
    });

    if (!railwayResponse.ok) {
      const errText = await railwayResponse.text();
      return new Response(
        JSON.stringify({ error: `Railway server error: ${railwayResponse.status} - ${errText}` }),
        { status: railwayResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await railwayResponse.json();

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
