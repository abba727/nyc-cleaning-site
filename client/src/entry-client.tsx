import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot, hydrateRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { readCmsSessionToken } from "./lib/cmsSessionToken";
import type { InitialPublishedArticle } from "./components/PublicPage";

declare global {
  interface Window {
    __INITIAL_ARTICLE__?: InitialPublishedArticle;
    __INITIAL_NOT_FOUND_PATH__?: string;
  }
}

const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
  links: [httpBatchLink({
    url: "/api/trpc",
    transformer: superjson,
    headers() {
      const token = readCmsSessionToken(window.sessionStorage, window.localStorage);
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    fetch(input, init) {
      return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
    },
  })],
});

const app = (
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}><App initialArticle={window.__INITIAL_ARTICLE__} initialNotFoundPath={window.__INITIAL_NOT_FOUND_PATH__} /></QueryClientProvider>
  </trpc.Provider>
);

const root = document.getElementById("root")!;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
