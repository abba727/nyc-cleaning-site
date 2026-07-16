import { trpc } from "@/lib/trpc";
import { clearCmsSessionToken, getCmsSessionExpiration, readCmsSessionToken } from "@/lib/cmsSessionToken";
import { useCallback, useEffect, useMemo } from "react";

const CMS_LOGOUT_REQUEST_TIMEOUT_MS = 8_000;

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await Promise.race([
        logoutMutation.mutateAsync(),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("Logout request timed out.")), CMS_LOGOUT_REQUEST_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearCmsSessionToken(window.sessionStorage, window.localStorage);
      utils.auth.me.setData(undefined, null);
    }
  }, [logoutMutation, utils]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = readCmsSessionToken(window.sessionStorage, window.localStorage);
    const expiresAt = getCmsSessionExpiration(token);
    if (!token || !expiresAt) return;

    const expireSession = () => {
      clearCmsSessionToken(window.sessionStorage, window.localStorage);
      utils.auth.me.setData(undefined, null);
      if (window.location.pathname.startsWith("/admin")) {
        window.location.replace("/admin?session=expired");
      }
    };
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      expireSession();
      return;
    }
    const timer = window.setTimeout(expireSession, remaining);
    return () => window.clearTimeout(timer);
  }, [utils]);

  useEffect(() => {
    if (typeof window === "undefined" || meQuery.isLoading || logoutMutation.isPending || meQuery.data) return;
    const token = readCmsSessionToken(window.sessionStorage, window.localStorage);
    if (!token) return;
    clearCmsSessionToken(window.sessionStorage, window.localStorage);
    if (window.location.pathname.startsWith("/admin")) {
      window.location.replace("/admin?session=expired");
    }
  }, [logoutMutation.isPending, meQuery.data, meQuery.isLoading]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    window.location.assign(redirectPath ?? "/admin");
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
