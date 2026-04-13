import { useState, useEffect, useCallback } from "react";
import AudioInput from "../components/AudioInput";
import TranscriptionResult from "../components/TranscriptionResult";
import TranscriptionHistory from "../components/TranscriptionHistory";
import AppHeader from "../components/AppHeader";
import LanguageSelector, {
  type Language,
} from "../components/LanguageSelector";
import EditableText from "../components/EditableText";
import { supabase, type Transcription } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function TranscriptionPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [inputLanguage, setInputLanguage] = useState<Language>("yiddish");
  const [outputLanguage, setOutputLanguage] = useState<Language>("yiddish");
  const [result, setResult] = useState<{
    text: string;
    filename: string;
    outputLang: Language;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Transcription[]>([]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setHistory(data as Transcription[]);
  }, [user?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleTranscribe = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180_000);

    try {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("input_language", inputLanguage);
      formData.append("output_language", outputLanguage);

      const response = await fetch(EDGE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${ANON_KEY}` },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await response.json();

      if (!response.ok || json.error) {
        setError(json.error ?? "Transcription failed. Please try again.");
        return;
      }

      const transcriptionText: string = json.transcription ?? "";

      setResult({
        text: transcriptionText,
        filename: file.name,
        outputLang: outputLanguage,
      });

      const { error: dbError } = await supabase.from("transcriptions").insert({
        filename: file.name,
        transcription: transcriptionText,
        file_size_bytes: file.size,
        language: inputLanguage,
        output_language: outputLanguage,
        user_id: user?.id,
      });

      if (dbError) {
        console.error("DB insert error:", dbError);
      }

      await loadHistory();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("הטראַנסקריפּציע האָט צו לאַנג גענומען. ביטע פּרוּווט נאָכאַמאָל.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Network error. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("transcriptions").delete().eq("id", id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100/50">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-stone-200/80 shadow-lg shadow-stone-200/20 p-8 mb-8">
          <EditableText
            contentKey="main_heading"
            defaultValue="טראַנסקריבירט אַודיאָ"
            as="h2"
            className="text-2xl font-bold text-stone-900 mb-1 font-hebrew"
            dir="rtl"
          />
          <p
            className="text-stone-500 text-[2rem] leading-[1.5] mb-6 font-display"
            dir="rtl"
          >
            קלייבט אויס די שפּראַך פֿון{" "}
            <span className="font-hebrew">audio</span>{" "}
            און די שפּראַך פֿון{" "}
            <span className="font-hebrew">result</span>{" "}
            וואס איר ווילט, דאן קענט איר אפלאודן אדער נעמט אויף.
          </p>

          <div className="mb-6">
            <LanguageSelector
              inputLanguage={inputLanguage}
              outputLanguage={outputLanguage}
              onInputChange={setInputLanguage}
              onOutputChange={setOutputLanguage}
              disabled={isLoading}
            />
          </div>

          <AudioInput onTranscribe={handleTranscribe} isLoading={isLoading} />
        </div>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm font-medium animate-fade-in font-hebrew"
            dir="rtl"
          >
            {error}
          </div>
        )}

        {result && (
          <div className="mb-8">
            <EditableText
              contentKey="result_heading"
              defaultValue="טראַנסקריפּציע"
              as="h3"
              className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3 font-hebrew"
              dir="rtl"
            />
            <TranscriptionResult
              text={result.text}
              filename={result.filename}
              language={result.outputLang}
            />
          </div>
        )}

        <TranscriptionHistory items={history} onDelete={handleDelete} />
      </main>

      <footer className="text-center text-stone-400 text-xs py-8 font-hebrew">
        yi-whisper &middot; Gemini &middot; Claude
      </footer>
    </div>
  );
}
