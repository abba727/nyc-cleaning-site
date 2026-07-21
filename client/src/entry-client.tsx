import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import type { InitialPublishedArticle } from "./components/PublicPage";

declare global {
  interface Window {
    __INITIAL_ARTICLE__?: InitialPublishedArticle;
    __INITIAL_NOT_FOUND_PATH__?: string;
    __INITIAL_INSIGHTS__?: InitialPublishedArticle[];
  }
}

const app = <App initialArticle={window.__INITIAL_ARTICLE__} initialNotFoundPath={window.__INITIAL_NOT_FOUND_PATH__} initialInsights={window.__INITIAL_INSIGHTS__} />;
const root = document.getElementById("root")!;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
