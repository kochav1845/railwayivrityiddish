import { Languages } from "lucide-react";
import EditableText from "./EditableText";

export type Language = "yiddish" | "english" | "hebrew";

interface LanguageOption {
  value: Language;
  label: string;
  nativeLabel: string;
}

const LANGUAGES: LanguageOption[] = [
  { value: "yiddish", label: "Yiddish", nativeLabel: "יידיש" },
  { value: "hebrew", label: "Hebrew", nativeLabel: "עברית" },
  { value: "english", label: "English", nativeLabel: "English" },
];

interface LanguageSelectorProps {
  inputLanguage: Language;
  outputLanguage: Language;
  onInputChange: (lang: Language) => void;
  onOutputChange: (lang: Language) => void;
  disabled?: boolean;
}

export default function LanguageSelector({
  inputLanguage,
  outputLanguage,
  onInputChange,
  onOutputChange,
  disabled = false,
}: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap" dir="rtl">
      <div className="flex-1 min-w-[140px]">
        <EditableText
          contentKey="input_lang_label"
          defaultValue="שפּראַך פֿון אַודיאָ"
          as="span"
          className="block text-xs font-semibold text-stone-500 mb-1.5 font-hebrew"
          dir="rtl"
        />
        <div className="relative">
          <select
            value={inputLanguage}
            onChange={(e) => onInputChange(e.target.value as Language)}
            disabled={disabled}
            className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 pr-10 text-stone-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all duration-200 disabled:opacity-50 cursor-pointer font-hebrew"
            dir="rtl"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.nativeLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-end pb-1">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
          <Languages size={16} className="text-amber-600" />
        </div>
      </div>

      <div className="flex-1 min-w-[140px]">
        <EditableText
          contentKey="output_lang_label"
          defaultValue="שפּראַך פֿון רעזולטאַט"
          as="span"
          className="block text-xs font-semibold text-stone-500 mb-1.5 font-hebrew"
          dir="rtl"
        />
        <div className="relative">
          <select
            value={outputLanguage}
            onChange={(e) => onOutputChange(e.target.value as Language)}
            disabled={disabled}
            className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 pr-10 text-stone-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all duration-200 disabled:opacity-50 cursor-pointer font-hebrew"
            dir="rtl"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.nativeLabel}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
