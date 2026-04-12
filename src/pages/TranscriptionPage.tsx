import { useState, useEffect, useCallback } from "react";
import { Mic2 } from "lucide-react";
import AudioInput from "../components/AudioInput";
import TranscriptionResult from "../components/TranscriptionResult";
import TranscriptionHistory from "../components/TranscriptionHistory";
import { supabase, type Transcription } from "../lib/supabase";

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function TranscriptionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Transcription[]>([]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("transcriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as Transcription[]);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleTranscribe = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("language", "yiddish");

      const response = await fetch(EDGE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${ANON_KEY}` },
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || json.error) {
        setError(json.error ?? "Transcription failed. Please try again.");
        return;
      }

      const transcriptionText: string = json.transcription ?? "";
      setResult({ text: transcriptionText, filename: file.name });

      await supabase.from("transcriptions").insert({
        filename: file.name,
        transcription: transcriptionText,
        file_size_bytes: file.size,
        language: "yiddish",
      });

      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <header className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shadow-sm">
            <Mic2 size={20} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900 leading-tight">Yiddish Transcriber</h1>
            <p className="text-stone-500 text-xs">Powered by ivrit-ai / yi-whisper-large-v3-turbo</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-stone-900 mb-1">Transcribe Yiddish Audio</h2>
          <p className="text-stone-500 text-sm mb-7">
            Upload an audio file or record directly in your browser. The model will transcribe spoken Yiddish.
          </p>
          <AudioInput onTranscribe={handleTranscribe} isLoading={isLoading} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Transcription</h3>
            <TranscriptionResult text={result.text} filename={result.filename} />
          </div>
        )}

        <TranscriptionHistory items={history} />
      </main>

      <footer className="text-center text-stone-400 text-xs py-8">
        ivrit-ai &middot; yi-whisper-large-v3-turbo &middot; Yiddish speech recognition
      </footer>
    </div>
  );
}
