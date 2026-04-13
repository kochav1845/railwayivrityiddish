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

async function transcribeWithRailway(
  audioBlob: Blob,
  filename: string,
  railwayUrl: string
): Promise<string> {
  const form = new FormData();
  form.append("audio", audioBlob, filename);

  const res = await fetch(`${railwayUrl}/transcribe`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Railway error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return json.transcription ?? "";
}

async function transcribeWithGemini(
  audioBlob: Blob,
  language: string,
  apiKey: string
): Promise<string> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );

  const mimeType = audioBlob.type || "audio/webm";
  const langLabel = language === "english" ? "English" : "Hebrew";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
                text: `Transcribe this audio. The spoken language is ${langLabel}. Return ONLY the transcribed text, nothing else. No labels, no prefixes, no explanations.`,
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
    `You are an expert Yiddish language editor. Your task is to correct grammar, spelling, and punctuation errors in the provided Yiddish text. Keep the meaning intact. Return ONLY the corrected Yiddish text. Do not add explanations, notes, or any other content.`,
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
    `You are a professional translator. Translate the following text from ${langNames[fromLang]} to ${langNames[toLang]}. Return ONLY the translated text. Do not add explanations, notes, labels, or any other content. Maintain the tone and meaning of the original text.`,
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
      let railwayUrl = Deno.env.get("RAILWAY_URL");
      if (!railwayUrl) {
        return jsonResponse(
          { error: "Railway server URL not configured." },
          500
        );
      }
      if (
        !railwayUrl.startsWith("http://") &&
        !railwayUrl.startsWith("https://")
      ) {
        railwayUrl = `https://${railwayUrl}`;
      }
      railwayUrl = railwayUrl.replace(/\/$/, "");

      rawTranscription = await transcribeWithRailway(
        blob,
        filename,
        railwayUrl
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
      }
    }

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
