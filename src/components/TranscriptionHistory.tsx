import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, FileAudio } from "lucide-react";
import type { Transcription } from "../lib/supabase";

interface TranscriptionHistoryProps {
  items: Transcription[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TranscriptionHistory({ items }: TranscriptionHistoryProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
        <Clock size={20} className="text-amber-600" />
        Recent Transcriptions
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors duration-150 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileAudio size={16} className="text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-stone-800 font-medium text-sm truncate">{item.filename || "Untitled"}</p>
                  <p className="text-stone-400 text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{formatDate(item.created_at)}</span>
                    {formatBytes(item.file_size_bytes) && <span>· {formatBytes(item.file_size_bytes)}</span>}
                    {item.language && (
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                        item.language === "yiddish"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700"
                      }`}>
                        {item.language}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {expanded === item.id ? (
                <ChevronUp size={16} className="text-stone-400 shrink-0 ml-2" />
              ) : (
                <ChevronDown size={16} className="text-stone-400 shrink-0 ml-2" />
              )}
            </button>
            {expanded === item.id && (
              <div
                dir="rtl"
                lang="yi"
                className="px-5 pb-5 pt-1 text-stone-700 text-base leading-relaxed font-serif border-t border-stone-100"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {item.transcription}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
