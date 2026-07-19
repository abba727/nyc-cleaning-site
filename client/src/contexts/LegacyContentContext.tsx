import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { LegacyContent } from "@/content/site";

export type LegacyArticleImages = Record<string, { src: string; alt: string }>;

export type LegacyContentPayload = {
  content: LegacyContent[];
  images: LegacyArticleImages;
};

type LegacyContentContextValue = {
  payload: LegacyContentPayload | null;
  loading: boolean;
  error: boolean;
  load: () => Promise<void>;
};

const LegacyContentContext = createContext<LegacyContentContextValue | null>(null);

function browserPayload(): LegacyContentPayload | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { __NYC_LEGACY_CONTENT__?: LegacyContentPayload }).__NYC_LEGACY_CONTENT__ || null;
}

export function LegacyContentProvider({
  children,
  initialPayload,
}: {
  children: ReactNode;
  initialPayload?: LegacyContentPayload | null;
}) {
  const [payload, setPayload] = useState<LegacyContentPayload | null>(() => initialPayload || browserPayload());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (payload || loading || error) return;
    setLoading(true);
    try {
      const [contentResponse, imagesResponse] = await Promise.all([
        fetch("/content/legacy-articles.json"),
        fetch("/content/article-images.json"),
      ]);
      if (!contentResponse.ok || !imagesResponse.ok) throw new Error("Legacy article content could not be loaded.");
      const [content, images] = await Promise.all([
        contentResponse.json() as Promise<LegacyContent[]>,
        imagesResponse.json() as Promise<LegacyArticleImages>,
      ]);
      setPayload({ content, images });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [error, loading, payload]);

  return <LegacyContentContext.Provider value={{ payload, loading, error, load }}>{children}</LegacyContentContext.Provider>;
}

export function useLegacyContent() {
  const value = useContext(LegacyContentContext);
  if (!value) throw new Error("useLegacyContent must be used within LegacyContentProvider.");
  return value;
}
