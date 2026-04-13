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

async function runpodTranscribe(
  audioBlob: Blob,
  filename: string,
  endpointRaw: string,
  apiKey: string
): Promise<string> {
  const buf = await audioBlob.arrayBuffer();
  const b64 = toBase64(new Uint8Array(buf));
  const ext = filename.includes(".") ? `.${filename.split(".").pop()}` : ".webm";

  const id = resolveEndpointId(endpointRaw);
  const base = `https://api.runpod.ai/v2/${id}`;

  console.log(`[RUNPOD] Endpoint: ${id}`);
  console.log(`[RUNPOD] Audio: ${buf.byteLength} bytes, ext: ${ext}`);
  console.log(`[RUNPOD] POST /run (async)...`);

  const t0 = Date.now();
  const submitRes = await fetch(`${base}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: { audio_base64: b64, extension: ext },
    }),
  });

  const submitText = await submitRes.text();
  const submitElapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[RUNPOD] Submit response ${submitRes.status} in ${submitElapsed}s`);

  if (!submitRes.ok) {
    console.error(`[RUNPOD] Submit error: ${submitText.substring(0, 500)}`);
    throw new Error(`RunPod HTTP ${submitRes.status}: ${submitText.substring(0, 200)}`);
  }

  let submitData;
  try {
    submitData = JSON.parse(submitText);
  } catch {
    console.error(`[RUNPOD] Invalid JSON: ${submitText.substring(0, 300)}`);
    throw new Error("RunPod returned invalid JSON");
  }

  const jobId = submitData.id;
  if (!jobId) throw new Error("RunPod returned no job ID");

  console.log(`[RUNPOD] Job submitted: ${jobId}, status: ${submitData.status}`);

  const maxWait = 300_000;
  const interval = 2_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, interval));

    const pollRes = await fetch(`${base}/status/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) {
      const errText = await pollRes.text();
      console.error(`[RUNPOD] Poll error ${pollRes.status}: ${errText.substring(0, 200)}`);
      throw new Error(`RunPod poll ${pollRes.status}: ${errText.substring(0, 200)}`);
    }

    const poll = await pollRes.json();
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`[RUNPOD] Poll ${jobId}: ${poll.status} (${secs}s total)`);

    if (poll.status === "COMPLETED") {
      if (poll.output?.error) {
        console.error(`[RUNPOD] Job error: ${poll.output.error}`);
        throw new Error(poll.output.error);
      }
      console.log(`[RUNPOD] Job done, transcription: ${(poll.output?.transcription ?? "").length} chars`);
      return poll.output?.transcription ?? "";
    }

    if (poll.status === "FAILED") {
      console.error(`[RUNPOD] Job failed: ${JSON.stringify(poll.error ?? poll.output)}`);
      throw new Error(poll.error ?? "RunPod job failed");
    }

    if (poll.status === "TIMED_OUT" || poll.status === "CANCELLED") {
      throw new Error(`RunPod job ${poll.status}`);
    }
  }

  throw new Error(`RunPod timed out after ${maxWait / 1000}s`);
}

async function geminiTranscribe(
  audioBlob: Blob,
  language: string,
  apiKey: string
): Promise<string> {
  const buf = await audioBlob.arrayBuffer();
  const b64 = toBase64(new Uint8Array(buf));
  const mime = audioBlob.type || "audio/webm";
  const langLabel = language === "english" ? "English" : "Hebrew";

  console.log(`[GEMINI] Transcribing ${language} (${buf.byteLength} bytes)`);
  const t0 = Date.now();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[GEMINI] Error ${res.status} (${elapsed}s): ${errText.substring(0, 300)}`);
    throw new Error(`Gemini error ${res.status}`);
  }

  const result = await res.json();
  const out = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  console.log(`[GEMINI] Done in ${elapsed}s, ${out.length} chars`);
  return out.trim();
}

async function callClaude(
  prompt: string,
  system: string,
  apiKey: string
): Promise<string> {
  const t0 = Date.now();
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

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[CLAUDE] Error ${res.status} (${elapsed}s): ${errText.substring(0, 300)}`);
    throw new Error(`Claude error ${res.status}`);
  }

  const result = await res.json();
  const out = result?.content?.[0]?.text?.trim() ?? "";
  console.log(`[CLAUDE] Done in ${elapsed}s, ${out.length} chars`);
  return out;
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

  const t0 = Date.now();
  console.log("=".repeat(60));
  console.log(`[EDGE] Request at ${new Date().toISOString()}`);

  try {
    const form = await req.formData();
    const audioFile = form.get("audio") as File | null;
    const inputLang = (form.get("input_language") as string) || "yiddish";
    const outputLang = (form.get("output_language") as string) || "yiddish";

    console.log(`[EDGE] ${inputLang} -> ${outputLang}`);

    if (!audioFile) {
      console.log("[EDGE] No audio file");
      return jsonRes({ error: "No audio file provided" }, 400);
    }

    console.log(`[EDGE] File: ${audioFile.name}, ${audioFile.size} bytes, ${audioFile.type}`);

    const blob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type || "audio/webm",
    });
    const fname = audioFile.name || "recording.webm";

    let rawText = "";

    if (inputLang === "yiddish") {
      const rpEndpoint = Deno.env.get("RUNPOD_ENDPOINT_ID");
      const rpKey = Deno.env.get("RUNPOD_API_KEY");
      if (!rpEndpoint || !rpKey) {
        console.error("[EDGE] Missing RunPod config");
        return jsonRes({ error: "RunPod not configured" }, 500);
      }

      rawText = await runpodTranscribe(blob, fname, rpEndpoint, rpKey);
      console.log(`[EDGE] RunPod: ${rawText.length} chars`);

      const aKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (aKey && rawText.trim()) {
        console.log("[EDGE] Grammar fix (Yiddish)...");
        rawText = await callClaude(rawText, grammarSystem("yiddish"), aKey);
      }
    } else {
      const gKey = Deno.env.get("GEMINI_API_KEY");
      if (!gKey) {
        console.error("[EDGE] Missing Gemini key");
        return jsonRes({ error: "Gemini not configured" }, 500);
      }

      rawText = await geminiTranscribe(blob, inputLang, gKey);
      console.log(`[EDGE] Gemini: ${rawText.length} chars`);

      if (inputLang === "hebrew") {
        const aKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (aKey && rawText.trim()) {
          console.log("[EDGE] Grammar fix (Hebrew)...");
          rawText = await callClaude(rawText, grammarSystem("hebrew"), aKey);
        }
      }
    }

    let finalText = rawText;

    if (inputLang !== outputLang && finalText.trim()) {
      const aKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!aKey) {
        console.error("[EDGE] Missing Anthropic key for translation");
        return jsonRes({ error: "Translation not configured" }, 500);
      }

      console.log(`[EDGE] Translating ${inputLang} -> ${outputLang}...`);
      finalText = await callClaude(finalText, translateSystem(inputLang, outputLang), aKey);

      if (outputLang === "yiddish" || outputLang === "hebrew") {
        console.log(`[EDGE] Post-translate grammar (${outputLang})...`);
        finalText = await callClaude(finalText, grammarSystem(outputLang), aKey);
      }
    }

    finalText = stripNikud(finalText);
    rawText = stripNikud(rawText);

    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[EDGE] Complete in ${secs}s | ${finalText.length} chars`);
    console.log("=".repeat(60));

    return jsonRes({
      transcription: finalText,
      raw_transcription: rawText,
      input_language: inputLang,
      output_language: outputLang,
    });
  } catch (err) {
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`[EDGE] FAILED ${secs}s:`, err);
    console.error("=".repeat(60));
    return jsonRes(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500
    );
  }
});
