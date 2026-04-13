import { useState } from "react";
import { Copy, Check, FileAudio } from "lucide-react";

interface TranscriptionResultProps {
  text: string;
  filename: string;
  language?: string;
}

const RTL_LANGUAGES = new Set(["yiddish", "hebrew"]);

export default function TranscriptionResult({
  text,
  filename,
  language = "yiddish",
}: TranscriptionResultProps) {
  const [copied, setCopied] = useState(false);
  const isRtl = RTL_LANGUAGES.has(language);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50/60">
        <div
          className="flex items-center gap-2 text-stone-600 text-sm font-medium truncate font-sans"
          dir="ltr"
        >
          <FileAudio size={15} className="text-amber-600 shrink-0" />
          <span className="truncate">{filename}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-200 shrink-0 mr-2 ${
            copied
              ? "bg-emerald-100 text-emerald-700"
              : "hover:bg-amber-100 text-amber-700"
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div
        dir={isRtl ? "rtl" : "ltr"}
        lang={language === "yiddish" ? "yi" : language === "hebrew" ? "he" : "en"}
        className={`p-6 text-stone-800 leading-[1.8] text-lg whitespace-pre-wrap ${
          isRtl ? "font-hebrew" : "font-sans"
        }`}
      >
        {text || (
          <span className="text-stone-400 italic">
            No transcription returned.
          </span>
        )}
      </div>
    </div>
  );
}
