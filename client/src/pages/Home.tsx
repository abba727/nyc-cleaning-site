import { PublicPage } from "@/components/PublicPage";

import type { InitialPublishedArticle } from "@/components/PublicPage";

export default function Home({ initialArticle, initialNotFoundPath, initialInsights }: { initialArticle?: InitialPublishedArticle | null; initialNotFoundPath?: string | null; initialInsights?: InitialPublishedArticle[] }) {
  return <PublicPage initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} initialInsights={initialInsights} />;
}
