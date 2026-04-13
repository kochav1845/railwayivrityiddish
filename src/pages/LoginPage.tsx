import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Mic2, Loader2, Mail, Lock, UserPlus, LogIn, ArrowLeft } from "lucide-react";

interface LoginPageProps {
  onBack?: () => void;
}

export default function LoginPage({ onBack }: LoginPageProps) {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("ביטע פֿילט אויס אַלע פֿעלדער");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError("די פּאַסווערטער שטימען נישט איבעראיין");
      return;
    }

    if (password.length < 6) {
      setError("פּאַסוואָרט מוז האָבן מינדסטנס 6 אותיות");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const { error: err } = await signUp(email, password);
        if (err) {
          setError(translateError(err));
        } else {
          setSuccess(
            "!באַניצער איז באַשאַפֿן געוואָרן. איר קענט זיך אַריינלאָגן"
          );
          setIsRegister(false);
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(translateError(err));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const translateError = (err: string) => {
    if (err.includes("Invalid login"))
      return "פֿאַלשע אימעיל אָדער פּאַסוואָרט";
    if (err.includes("already registered"))
      return "די אימעיל איז שוין רעגיסטרירט";
    if (err.includes("invalid email")) return "אומגילטיקע אימעיל אַדרעס";
    return err;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-stone-200/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute -top-2 left-0 flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        )}
        <div className="text-center mb-8 mt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-200/50 mb-5">
            <Mic2 size={28} className="text-white" strokeWidth={1.8} />
          </div>
          <h1
            className="text-3xl font-bold text-stone-900 mb-1 font-hebrew"
            dir="rtl"
          >
            יידיש טרענסילעישן - איבערטייטשער
          </h1>
          <p className="text-stone-500 text-sm font-hebrew" dir="rtl">
            שפּראַך-צו-טעקסט מיט קינסטלעכע אינטעליגענץ
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200/80 shadow-xl shadow-stone-200/20 p-8">
          <div className="flex bg-stone-100 rounded-xl p-1 mb-7">
            <button
              onClick={() => {
                setIsRegister(false);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                !isRegister
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
              dir="rtl"
            >
              <LogIn size={15} />
              <span className="font-hebrew">אַריינלאָגן</span>
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isRegister
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
              dir="rtl"
            >
              <UserPlus size={15} />
              <span className="font-hebrew">רעגיסטרירן</span>
            </button>
          </div>

          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm font-medium font-hebrew"
              dir="rtl"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-5 text-sm font-medium font-hebrew"
              dir="rtl"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium text-stone-700 mb-1.5 font-hebrew"
                dir="rtl"
              >
                אימעיל
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-200 font-hebrew text-sm"
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-stone-700 mb-1.5 font-hebrew"
                dir="rtl"
              >
                פּאַסוואָרט
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-200 font-hebrew text-sm"
                  placeholder="******"
                  dir="ltr"
                />
              </div>
            </div>

            {isRegister && (
              <div className="animate-fade-in">
                <label
                  className="block text-sm font-medium text-stone-700 mb-1.5 font-hebrew"
                  dir="rtl"
                >
                  באַשטעטיקט פּאַסוואָרט
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-200 font-hebrew text-sm"
                    placeholder="******"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-amber-200/40 hover:shadow-lg hover:shadow-amber-200/50 flex items-center justify-center gap-2 mt-2"
              dir="rtl"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isRegister ? (
                <>
                  <UserPlus size={16} />
                  <span className="font-hebrew">רעגיסטרירן</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span className="font-hebrew">אַריינלאָגן</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-stone-400 text-xs mt-6 font-hebrew">
          ivrit-ai &middot; yi-whisper-large-v3-turbo
        </p>
      </div>
    </div>
  );
}
