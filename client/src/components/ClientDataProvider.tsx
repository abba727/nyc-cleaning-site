import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import { readCmsSessionToken } from "@/lib/cmsSessionToken";

export function ClientDataProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => trpc.createClient({
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
  }));

  return <trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></trpc.Provider>;
}
