import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const ADMIN_EMAIL = "a88933513@gmail.com";

interface SiteContentState {
  content: Record<string, string>;
  isAdmin: boolean;
  updateContent: (key: string, value: string) => Promise<void>;
  loading: boolean;
}

const SiteContentContext = createContext<SiteContentState | undefined>(undefined);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.email === ADMIN_EMAIL;

  const loadContent = useCallback(async () => {
    const { data } = await supabase.from("site_content").select("content_key, content_value");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((row) => {
        map[row.content_key] = row.content_value;
      });
      setContent(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadContent();
  }, [user, loadContent]);

  const updateContent = useCallback(
    async (key: string, value: string) => {
      setContent((prev) => ({ ...prev, [key]: value }));
      await supabase.from("site_content").upsert(
        { content_key: key, content_value: value, updated_by: user?.id, updated_at: new Date().toISOString() },
        { onConflict: "content_key" }
      );
    },
    [user?.id]
  );

  return (
    <SiteContentContext.Provider value={{ content, isAdmin, updateContent, loading }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext);
  if (!ctx) throw new Error("useSiteContent must be used within SiteContentProvider");
  return ctx;
}
