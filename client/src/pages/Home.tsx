import { PublicPage } from "@/components/PublicPage";

import type { InitialPublishedArticle } from "@/components/PublicPage";

export default function Home({ initialArticle, initialNotFoundPath }: { initialArticle?: InitialPublishedArticle | null; initialNotFoundPath?: string | null }) {
  return <PublicPage initialArticle={initialArticle} initialNotFoundPath={initialNotFoundPath} />;
}
