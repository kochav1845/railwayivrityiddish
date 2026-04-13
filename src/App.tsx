import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SiteContentProvider } from "./contexts/SiteContentContext";
import LoginPage from "./pages/LoginPage";
import TranscriptionPage from "./pages/TranscriptionPage";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <SiteContentProvider>
      <TranscriptionPage />
    </SiteContentProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
