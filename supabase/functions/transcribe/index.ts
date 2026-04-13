import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripNikud(text: string): string {
  return text.replace(/[\u0591-\u05C7]/g, "");
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function resolveRunpodEndpointId(raw: string): string {
  let id = raw.trim();

  const v2Match = id.match(/https?:\/\/api\.runpod\.ai\/v2\/([^/]+)/);
  if (v2Match) return v2Match[1];

  const subdomainMatch = id.match(/https?:\/\/([^.]+)\.api\.runpod\.ai/);
  if (subdomainMatch) return subdomainMatch[1];

  return id.replace(/[/\s]/g, "");
}

async function transcribeWithRunpod(
  audioBlob: Blob,
  filename: string,
  runpodEndpointId: string,
  runpodApiKey: string
): Promise<string> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = uint8ToBase64(new Uint8Array(arrayBuffer));

  const ext = filename.includes(".")
    ? `.${filename.split(".").pop()}`
    : ".webm";

  const endpointId = resolveRunpodEndpointId(runpodEndpointId);
  const baseUrl = `https://api.runpod.ai/v2/${endpointId}`;

  console.log(`RUNPOD_ENDPOINT_ID raw: "${runpodEndpointId}"`);
  console.log(`Resolved endpoint ID: "${endpointId}"`);
  console.log(`RunPod run URL: ${baseUrl}/run`);

  const healthRes = await fetch(`${baseUrl}/health`, {
    headers: { Authorization: `Bearer ${runpodApiKey}` },
  });
  const healthText = await healthRes.text();
  console.log(`RunPod health ${healthRes.status}: ${healthText}`);

  const runRes = await fetch(`${baseUrl}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${runpodApiKey}`,
    },
    body: JSON.stringify({
      input: { audio_base64: base64Audio, extension: ext },
    }),
  });

  const runText = await runRes.text();
  console.log(`RunPod run response ${runRes.status}: ${runText}`);

  if (!runRes.ok) {
    throw new Error(`RunPod error ${runRes.status}: ${runText}`);
  }

  let runJson;
  try {
    runJson = JSON.parse(runText);
  } catch {
    throw new Error(`RunPod returned invalid JSON: ${runText}`);
  }

  const jobId = runJson.id;
  if (!jobId) throw new Error("RunPod did not return a job ID");

  const maxWait = 120_000;
  const pollInterval = 3_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(`${baseUrl}/status/${jobId}`, {
      headers: { Authorization: `Bearer ${runpodApiKey}` },
    });

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      throw new Error(`RunPod status error ${statusRes.status}: ${errText}`);
    }

    const statusJson = await statusRes.json();
    console.log(`RunPod job ${jobId} status: ${statusJson.status}`);

    if (statusJson.status === "COMPLETED") {
      if (statusJson.output?.error) throw new Error(statusJson.output.error);
      return statusJson.output?.transcription ?? "";
    }

    if (statusJson.status === "FAILED") {
      throw new Error(statusJson.error ?? "RunPod job failed");
    }
  }

  throw new Error("RunPod transcription timed out");
}

async function transcribeWithGemini(
  audioBlob: Blob,
  language: string,
  apiKey: string
): Promise<string> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = uint8ToBase64(new Uint8Array(arrayBuffer));

  const mimeType = audioBlob.type || "audio/webm";
  const langLabel = language === "english" ? "English" : "Hebrew";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Audio,
                },
              },
              {
                text: `Transcribe this audio. The spoken language is ${langLabel}. Return ONLY the transcribed text, nothing else. No labels, no prefixes, no explanations. IMPORTANT: Do NOT include any nikud (Hebrew vowel diacritics/points) in the output.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text.trim();
}

async function callClaude(
  prompt: string,
  systemPrompt: string,
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
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return json?.content?.[0]?.text?.trim() ?? "";
}

async function fixYiddishGrammar(
  text: string,
  apiKey: string
): Promise<string> {
  if (!text.trim()) return text;

  return callClaude(
    text,
    `You are an expert Yiddish language editor. Your task is to correct grammar, spelling, and punctuation errors in the provided Yiddish text. Keep the meaning intact. Return ONLY the corrected Yiddish text. Do not add explanations, notes, or any other content. IMPORTANT: Do NOT include any nikud (Hebrew vowel diacritics/points) in the output.`,
    apiKey
  );
}

async function fixHebrewGrammar(
  text: string,
  apiKey: string
): Promise<string> {
  if (!text.trim()) return text;

  return callClaude(
    text,
    `You are an expert Hebrew language editor. Your task is to correct grammar, spelling, and punctuation errors in the provided Hebrew text. Keep the meaning intact. Return ONLY the corrected Hebrew text. Do not add explanations, notes, or any other content. IMPORTANT: Do NOT include any nikud (Hebrew vowel diacritics/points) in the output.`,
    apiKey
  );
}

async function translateText(
  text: string,
  fromLang: string,
  toLang: string,
  apiKey: string
): Promise<string> {
  if (!text.trim()) return text;

  const langNames: Record<string, string> = {
    yiddish: "Yiddish",
    english: "English",
    hebrew: "Hebrew",
  };

  return callClaude(
    text,
    `You are a professional translator. Translate the following text from ${langNames[fromLang]} to ${langNames[toLang]}. Return ONLY the translated text. Do not add explanations, notes, labels, or any other content. Maintain the tone and meaning of the original text. IMPORTANT: Do NOT include any nikud (Hebrew vowel diacritics/points) in the output.`,
    apiKey
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const incomingForm = await req.formData();
    const audioFile = incomingForm.get("audio") as File | null;
    const inputLanguage =
      (incomingForm.get("input_language") as string) || "yiddish";
    const outputLanguage =
      (incomingForm.get("output_language") as string) || "yiddish";

    if (!audioFile) {
      return jsonResponse({ error: "No audio file provided" }, 400);
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: audioFile.type || "audio/webm",
    });
    const filename = audioFile.name || "recording.webm";

    let rawTranscription = "";

    if (inputLanguage === "yiddish") {
      const runpodEndpointId = Deno.env.get("RUNPOD_ENDPOINT_ID");
      const runpodApiKey = Deno.env.get("RUNPOD_API_KEY");
      if (!runpodEndpointId || !runpodApiKey) {
        return jsonResponse(
          { error: "RunPod configuration missing." },
          500
        );
      }

      rawTranscription = await transcribeWithRunpod(
        blob,
        filename,
        runpodEndpointId,
        runpodApiKey
      );

      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (anthropicKey && rawTranscription.trim()) {
        rawTranscription = await fixYiddishGrammar(
          rawTranscription,
          anthropicKey
        );
      }
    } else {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiKey) {
        return jsonResponse(
          { error: "Gemini API key not configured." },
          500
        );
      }

      rawTranscription = await transcribeWithGemini(
        blob,
        inputLanguage,
        geminiKey
      );

      if (inputLanguage === "hebrew") {
        const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (anthropicKey && rawTranscription.trim()) {
          rawTranscription = await fixHebrewGrammar(
            rawTranscription,
            anthropicKey
          );
        }
      }
    }

    let finalText = rawTranscription;

    if (inputLanguage !== outputLanguage && finalText.trim()) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        return jsonResponse(
          { error: "Anthropic API key not configured for translation." },
          500
        );
      }

      finalText = await translateText(
        finalText,
        inputLanguage,
        outputLanguage,
        anthropicKey
      );

      if (outputLanguage === "yiddish") {
        finalText = await fixYiddishGrammar(finalText, anthropicKey);
      } else if (outputLanguage === "hebrew") {
        finalText = await fixHebrewGrammar(finalText, anthropicKey);
      }
    }

    finalText = stripNikud(finalText);
    rawTranscription = stripNikud(rawTranscription);

    return jsonResponse({
      transcription: finalText,
      raw_transcription: rawTranscription,
      input_language: inputLanguage,
      output_language: outputLanguage,
    });
  } catch (err) {
    return jsonResponse(
      {
        error:
          err instanceof Error ? err.message : "Unexpected error",
      },
      500
    );
  }
});
