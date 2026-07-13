import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot, hydrateRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError) || typeof window === "undefined") return;
  if (error.message === UNAUTHED_ERR_MSG) startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") redirectToLoginIfUnauthorized(event.query.state.error);
});
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") redirectToLoginIfUnauthorized(event.mutation.state.error);
});

const trpcClient = trpc.createClient({
  links: [httpBatchLink({
    url: "/api/trpc",
    transformer: superjson,
    headers() {
      try {
        const raw = sessionStorage.getItem("manus-cookie");
        if (raw) {
          const prefix = `${COOKIE_NAME}=`;
          const pair = raw.split(";").find(value => value.trim().startsWith(prefix));
          const token = pair?.trim().slice(prefix.length);
          if (token) return { Authorization: `Bearer ${token}` };
        }
      } catch {
        // sessionStorage may be unavailable in privacy-restricted contexts.
      }
      return {};
    },
    fetch(input, init) {
      return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
    },
  })],
});

const app = (
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
  </trpc.Provider>
);

const root = document.getElementById("root")!;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
