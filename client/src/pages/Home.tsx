import { PublicPage } from "@/components/PublicPage";

import type { InitialPublishedArticle, LegacyContentPageRenderer } from "@/components/PublicPage";

export default function Home({ initialArticle, initialNotFoundPath, initialInsights, initialLegacyRenderer }: { initialArticle?: InitialPublishedArticle | null; initialNotFoundPath?: string | null; initialInsights?: InitialPublishedArticle[]; initialLegacyRenderer?: LegacyContentPageRenderer }) {
  return <PublicPage initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} initialInsights={initialInsights} initialLegacyRenderer={initialLegacyRenderer} />;
}
