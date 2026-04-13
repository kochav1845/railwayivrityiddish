import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripNikud(text: string): string {
  return text.replace(/[\u0591-\u05C7]/g, "");
}

function toBase64(bytes: Uint8Array): string {
  const chunk = 8192;
  let bin = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function resolveEndpointId(raw: string): string {
  const trimmed = raw.trim();
  const v2 = trimmed.match(/https?:\/\/api\.runpod\.ai\/v2\/([^/]+)/);
  if (v2) return v2[1];
  const sub = trimmed.match(/https?:\/\/([^.]+)\.api\.runpod\.ai/);
  if (sub) return sub[1];
  return trimmed.replace(/[/\s]/g, "");
}

async function handleSubmit(req: Request): Promise<Response> {
  const form = await req.formData();
  const audioFile = form.get("audio") as File | null;
  const inputLang = (form.get("input_language") as string) || "yiddish";
  const outputLang = (form.get("output_language") as string) || "yiddish";

  if (!audioFile) {
    return jsonRes({ error: "No audio file provided" }, 400);
  }

  console.log(`[SUBMIT] ${audioFile.name}, ${audioFile.size} bytes, ${inputLang} -> ${outputLang}`);

  const buf = await audioFile.arrayBuffer();
  const b64 = toBase64(new Uint8Array(buf));
  const ext = audioFile.name.includes(".") ? `.${audioFile.name.split(".").pop()}` : ".webm";
  const mime = audioFile.type || "audio/webm";

  if (inputLang === "yiddish") {
    const rpEndpoint = Deno.env.get("RUNPOD_ENDPOINT_ID");
    const rpKey = Deno.env.get("RUNPOD_API_KEY");
    if (!rpEndpoint || !rpKey) {
      return jsonRes({ error: "RunPod not configured" }, 500);
    }

    const id = resolveEndpointId(rpEndpoint);
    const submitRes = await fetch(`https://api.runpod.ai/v2/${id}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${rpKey}`,
      },
      body: JSON.stringify({
        input: { audio_base64: b64, extension: ext },
      }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      console.error(`[SUBMIT] RunPod error: ${errText.substring(0, 300)}`);
      return jsonRes({ error: `RunPod error ${submitRes.status}` }, 502);
    }

    const submitData = await submitRes.json();
    const jobId = submitData.id;
    if (!jobId) {
      return jsonRes({ error: "RunPod returned no job ID" }, 502);
    }

    console.log(`[SUBMIT] RunPod job: ${jobId}`);
    return jsonRes({ jobId, provider: "runpod", inputLang, outputLang });
  } else {
    const gKey = Deno.env.get("GEMINI_API_KEY");
    if (!gKey) {
      return jsonRes({ error: "Gemini not configured" }, 500);
    }

    const langLabel = inputLang === "english" ? "English" : "Hebrew";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mime, data: b64 } },
                {
                  text: `Transcribe this audio. The spoken language is ${langLabel}. Return ONLY the transcribed text, nothing else. No labels, no prefixes, no explanations. Do NOT include any nikud (Hebrew vowel diacritics/points).`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[SUBMIT] Gemini error: ${errText.substring(0, 300)}`);
      return jsonRes({ error: `Gemini error ${res.status}` }, 502);
    }

    const result = await res.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    console.log(`[SUBMIT] Gemini done: ${rawText.length} chars`);

    return jsonRes({
      status: "COMPLETED",
      rawText: stripNikud(rawText),
      inputLang,
      outputLang,
      provider: "gemini",
    });
  }
}

async function handlePoll(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return jsonRes({ error: "Missing jobId" }, 400);
  }

  const rpEndpoint = Deno.env.get("RUNPOD_ENDPOINT_ID");
  const rpKey = Deno.env.get("RUNPOD_API_KEY");
  if (!rpEndpoint || !rpKey) {
    return jsonRes({ error: "RunPod not configured" }, 500);
  }

  const id = resolveEndpointId(rpEndpoint);
  const pollRes = await fetch(`https://api.runpod.ai/v2/${id}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${rpKey}` },
  });

  if (!pollRes.ok) {
    const errText = await pollRes.text();
    console.error(`[POLL] Error ${pollRes.status}: ${errText.substring(0, 200)}`);
    return jsonRes({ error: `RunPod poll error ${pollRes.status}` }, 502);
  }

  const poll = await pollRes.json();
  console.log(`[POLL] ${jobId}: ${poll.status}`);

  if (poll.status === "COMPLETED") {
    if (poll.output?.error) {
      return jsonRes({ status: "FAILED", error: poll.output.error });
    }
    const rawText = stripNikud(poll.output?.transcription ?? "");
    return jsonRes({ status: "COMPLETED", rawText });
  }

  if (poll.status === "FAILED") {
    return jsonRes({ status: "FAILED", error: poll.error ?? "RunPod job failed" });
  }

  if (poll.status === "TIMED_OUT" || poll.status === "CANCELLED") {
    return jsonRes({ status: "FAILED", error: `RunPod job ${poll.status}` });
  }

  return jsonRes({ status: "IN_PROGRESS" });
}

async function handleProcess(req: Request): Promise<Response> {
  const body = await req.json();
  const { rawText, inputLang, outputLang } = body as {
    rawText: string;
    inputLang: string;
    outputLang: string;
  };

  if (!rawText?.trim()) {
    return jsonRes({ transcription: "", raw_transcription: "" });
  }

  const aKey = Deno.env.get("ANTHROPIC_API_KEY");
  let finalText = rawText;

  if (aKey) {
    if (inputLang === "yiddish" || inputLang === "hebrew") {
      console.log(`[PROCESS] Grammar fix (${inputLang})...`);
      finalText = await callClaude(finalText, grammarSystem(inputLang), aKey);
    }

    if (inputLang !== outputLang) {
      console.log(`[PROCESS] Translate ${inputLang} -> ${outputLang}...`);
      finalText = await callClaude(finalText, translateSystem(inputLang, outputLang), aKey);

      if (outputLang === "yiddish" || outputLang === "hebrew") {
        console.log(`[PROCESS] Post-translate grammar (${outputLang})...`);
        finalText = await callClaude(finalText, grammarSystem(outputLang), aKey);
      }
    }
  }

  finalText = stripNikud(finalText);
  const cleanRaw = stripNikud(rawText);

  console.log(`[PROCESS] Done: ${finalText.length} chars`);
  return jsonRes({
    transcription: finalText,
    raw_transcription: cleanRaw,
    input_language: inputLang,
    output_language: outputLang,
  });
}

async function callClaude(
  prompt: string,
  system: string,
  apiKey: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[CLAUDE] Error ${res.status}: ${errText.substring(0, 300)}`);
    throw new Error(`Claude error ${res.status}`);
  }

  const result = await res.json();
  return result?.content?.[0]?.text?.trim() ?? "";
}

function grammarSystem(lang: string): string {
  const name = lang === "yiddish" ? "Yiddish" : "Hebrew";
  return `You are an expert ${name} language editor. Correct grammar, spelling, and punctuation errors. Keep the meaning intact. Return ONLY the corrected text. No explanations. Do NOT include any nikud.`;
}

function translateSystem(from: string, to: string): string {
  const names: Record<string, string> = {
    yiddish: "Yiddish",
    english: "English",
    hebrew: "Hebrew",
  };
  return `You are a professional translator. Translate from ${names[from]} to ${names[to]}. Return ONLY the translated text. No explanations, no labels. Maintain tone and meaning. Do NOT include any nikud.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === "GET" && url.searchParams.has("jobId")) {
      return await handlePoll(req);
    }

    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        return await handleProcess(req);
      }

      if (contentType.includes("multipart/form-data")) {
        return await handleSubmit(req);
      }
    }

    return jsonRes({ error: "Invalid request" }, 400);
  } catch (err) {
    console.error("[EDGE] Unhandled:", err);
    return jsonRes(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500
    );
  }
});
