import type { Language } from "../pages/TranscriptionPage";

interface LanguageSelectorProps {
  value: Language;
  onChange: (lang: Language) => void;
  disabled?: boolean;
}

const languages: { value: Language; label: string; native: string }[] = [
  { value: "yiddish", label: "Yiddish", native: "יידיש" },
  { value: "hebrew", label: "Hebrew", native: "עברית" },
];

export default function LanguageSelector({ value, onChange, disabled }: LanguageSelectorProps) {
  return (
    <div className="flex items-center bg-stone-100 rounded-xl p-1 gap-0.5">
      {languages.map((lang) => {
        const isActive = value === lang.value;
        return (
          <button
            key={lang.value}
            onClick={() => onChange(lang.value)}
            disabled={disabled}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${isActive
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span className="hidden sm:inline">{lang.label}</span>
            <span className="sm:hidden">{lang.native}</span>
            <span className="hidden sm:inline text-stone-400 ml-1.5 text-xs">{lang.native}</span>
          </button>
        );
      })}
    </div>
  );
}
