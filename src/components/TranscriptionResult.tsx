import { useState } from "react";
import { Copy, Check, FileAudio } from "lucide-react";

interface TranscriptionResultProps {
  text: string;
  filename: string;
}

export default function TranscriptionResult({ text, filename }: TranscriptionResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50">
        <div className="flex items-center gap-2 text-stone-600 text-sm font-medium truncate">
          <FileAudio size={16} className="text-amber-600 shrink-0" />
          <span className="truncate">{filename}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors duration-150 shrink-0 ml-2"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div
        dir="rtl"
        lang="yi"
        className="p-6 text-stone-800 leading-relaxed text-lg font-serif whitespace-pre-wrap"
        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
      >
        {text || <span className="text-stone-400 italic">No transcription returned.</span>}
      </div>
    </div>
  );
}
