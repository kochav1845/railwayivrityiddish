import { Mic2, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import EditableText from "./EditableText";

export default function AppHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3" dir="rtl">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-sm">
            <Mic2 size={20} className="text-white" strokeWidth={1.8} />
          </div>
          <div>
            <EditableText
              contentKey="header_title"
              defaultValue="יידיש טראַנסקריבער"
              as="h1"
              className="text-lg font-bold text-stone-900 leading-tight font-hebrew"
              dir="rtl"
            />
            <p className="text-stone-400 text-[11px] font-display" dir="ltr">
              ivrit-ai / yi-whisper-large-v3-turbo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-stone-400 text-xs font-display hidden sm:block truncate max-w-[160px]"
            dir="ltr"
          >
            {user?.email}
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors duration-150 text-sm font-medium"
            dir="rtl"
            title="אַרויסלאָגן"
          >
            <LogOut size={15} />
            <EditableText
              contentKey="header_logout"
              defaultValue="אַרויסלאָגן"
              as="span"
              className="hidden sm:inline font-hebrew"
              dir="rtl"
            />
          </button>
        </div>
      </div>
    </header>
  );
}
