import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import type { InitialPublishedArticle, LegacyContentPageRenderer } from "./components/PublicPage";

declare global {
  interface Window {
    __INITIAL_ARTICLE__?: InitialPublishedArticle;
    __INITIAL_NOT_FOUND_PATH__?: string;
    __INITIAL_INSIGHTS__?: InitialPublishedArticle[];
    __NYC_LEGACY_CONTENT__?: unknown;
  }
}

async function bootstrap() {
  const initialArticle = window.__INITIAL_ARTICLE__;
  let initialLegacyRenderer: LegacyContentPageRenderer | undefined;

  // CMS and existing legacy insight pages are server-rendered for search
  // visibility. Load their renderer before hydration so React receives the same
  // element tree, while keeping the archive/editorial module off other routes.
  if (initialArticle || window.__NYC_LEGACY_CONTENT__ || window.__INITIAL_NOT_FOUND_PATH__) {
    try {
      const module = await import("./components/LegacyContentPage");
      initialLegacyRenderer = module.default;
    } catch (error) {
      console.error("[Hydration] CMS article renderer could not be loaded", error);
    }
  }

  const app = <App
    initialArticle={initialArticle}
    initialNotFoundPath={window.__INITIAL_NOT_FOUND_PATH__}
    initialInsights={window.__INITIAL_INSIGHTS__}
    initialLegacyRenderer={initialLegacyRenderer}
  />;
  const root = document.getElementById("root")!;
  if (root.hasChildNodes()) hydrateRoot(root, app);
  else createRoot(root).render(app);
}

void bootstrap();
