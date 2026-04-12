import { useState, useEffect, useCallback } from "react";
import AudioInput from "../components/AudioInput";
import TranscriptionResult from "../components/TranscriptionResult";
import TranscriptionHistory from "../components/TranscriptionHistory";
import AppHeader from "../components/AppHeader";
import { supabase, type Transcription } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function TranscriptionPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    text: string;
    filename: string;
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
        setError(json.error ?? "טראַנסקריפּציע איז דורכגעפֿאַלן. פּרובירט נאָכאַמאָל.");
        return;
      }

      const transcriptionText: string = json.transcription ?? "";
      setResult({ text: transcriptionText, filename: file.name });

      await supabase.from("transcriptions").insert({
        filename: file.name,
        transcription: transcriptionText,
        file_size_bytes: file.size,
        language: "yiddish",
        user_id: user?.id,
      });

      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "נעטוואָרק פֿעלער. פּרובירט נאָכאַמאָל."
      );
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
          <h2
            className="text-2xl font-bold text-stone-900 mb-1 font-hebrew"
            dir="rtl"
          >
            טראַנסקריבירט יידיש אַודיאָ
          </h2>
          <p className="text-stone-500 text-sm mb-7 font-hebrew" dir="rtl">
            לאָדט אַרויף אַ אַודיאָ טעקע אָדער נעמט אויף דירעקט אין בלעטערער.
            דער מאָדעל וועט טראַנסקריבירן גערעדט יידיש.
          </p>
          <AudioInput onTranscribe={handleTranscribe} isLoading={isLoading} />
        </div>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm font-medium font-hebrew animate-fade-in"
            dir="rtl"
          >
            {error}
          </div>
        )}

        {result && (
          <div className="mb-8">
            <h3
              className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3 font-hebrew"
              dir="rtl"
            >
              טראַנסקריפּציע
            </h3>
            <TranscriptionResult
              text={result.text}
              filename={result.filename}
            />
          </div>
        )}

        <TranscriptionHistory items={history} onDelete={handleDelete} />
      </main>

      <footer className="text-center text-stone-400 text-xs py-8 font-sans">
        ivrit-ai &middot; yi-whisper-large-v3-turbo &middot; יידיש שפּראַך
        דערקענונג
      </footer>
    </div>
  );
}
