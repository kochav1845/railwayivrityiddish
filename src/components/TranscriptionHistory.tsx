import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  FileAudio,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import type { Transcription } from "../lib/supabase";

interface TranscriptionHistoryProps {
  items: Transcription[];
  onDelete?: (id: string) => void;
}

const RTL_LANGUAGES = new Set(["yiddish", "hebrew"]);

const LANG_LABELS: Record<string, string> = {
  yiddish: "יידיש",
  hebrew: "עברית",
  english: "EN",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("he-IL", {
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

function langBadgeColor(lang: string) {
  switch (lang) {
    case "yiddish":
      return "bg-amber-100 text-amber-700";
    case "hebrew":
      return "bg-sky-100 text-sky-700";
    case "english":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-stone-100 text-stone-600";
  }
}

export default function TranscriptionHistory({
  items,
  onDelete,
}: TranscriptionHistoryProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in" dir="rtl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stone-100 mb-4">
          <Clock size={24} className="text-stone-300" />
        </div>
        <p className="text-stone-400 font-medium font-hebrew text-lg">
          נאָך נישטאָ קיין אויפֿנאַמעס
        </p>
        <p className="text-stone-300 text-sm mt-1 font-hebrew">
          אייערע טראַנסקריפּציעס וועלן דאָ אויפֿטרעטן
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2 font-hebrew">
        <Clock size={18} className="text-amber-600" />
        פֿריערדיקע אויפֿנאַמעס
      </h2>
      <div className="space-y-2">
        {items.map((item, i) => {
          const outLang = item.output_language || item.language;
          const isRtl = RTL_LANGUAGES.has(outLang);

          return (
            <div
              key={item.id}
              className="bg-white border border-stone-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <button
                onClick={() =>
                  setExpanded(expanded === item.id ? null : item.id)
                }
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50/60 transition-colors duration-150 text-right"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <FileAudio size={14} className="text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-stone-800 font-medium text-sm truncate font-hebrew">
                      {item.filename || "אָן נאָמען"}
                    </p>
                    <p
                      className="text-stone-400 text-xs mt-0.5 flex items-center gap-1.5 flex-wrap font-sans"
                      dir="ltr"
                    >
                      <span>{formatDate(item.created_at)}</span>
                      {formatBytes(item.file_size_bytes) && (
                        <span>
                          &middot; {formatBytes(item.file_size_bytes)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide ${langBadgeColor(
                            item.language
                          )}`}
                        >
                          {LANG_LABELS[item.language] ?? item.language}
                        </span>
                        {item.language !== outLang && (
                          <>
                            <ArrowLeft size={10} className="text-stone-400" />
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide ${langBadgeColor(
                                outLang
                              )}`}
                            >
                              {LANG_LABELS[outLang] ?? outLang}
                            </span>
                          </>
                        )}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mr-2">
                  {onDelete && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          onDelete(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                    >
                      <Trash2 size={14} />
                    </span>
                  )}
                  {expanded === item.id ? (
                    <ChevronUp
                      size={16}
                      className="text-stone-400 shrink-0"
                    />
                  ) : (
                    <ChevronDown
                      size={16}
                      className="text-stone-400 shrink-0"
                    />
                  )}
                </div>
              </button>
              {expanded === item.id && (
                <div
                  dir={isRtl ? "rtl" : "ltr"}
                  lang={
                    outLang === "yiddish"
                      ? "yi"
                      : outLang === "hebrew"
                      ? "he"
                      : "en"
                  }
                  className={`px-5 pb-5 pt-2 text-stone-700 text-base leading-[1.8] border-t border-stone-100 animate-fade-in ${
                    isRtl ? "font-hebrew" : "font-sans"
                  }`}
                >
                  {item.transcription}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
