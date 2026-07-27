export const PUBLIC_SSR_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
export const PRIVATE_SSR_CACHE_CONTROL = "no-store";

type SsrResponseDescriptor = {
  method: string;
  originalUrl: string;
  status: number;
};

/**
 * Public site pages are user-agnostic during SSR, so short-lived caching can
 * reduce repeat-visit latency. CMS/admin/API/form responses remain uncacheable
 * to avoid serving stale or private state.
 */
export function getSsrCacheControl({ method, originalUrl, status }: SsrResponseDescriptor): string {
  if (method.toUpperCase() !== "GET" || status !== 200) {
    return PRIVATE_SSR_CACHE_CONTROL;
  }

  const pathname = new URL(originalUrl, "http://localhost").pathname;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isApiPath = pathname === "/api" || pathname.startsWith("/api/");
  const isThankYouPath = pathname === "/thank-you" || pathname === "/thank-you/";

  return isAdminPath || isApiPath || isThankYouPath
    ? PRIVATE_SSR_CACHE_CONTROL
    : PUBLIC_SSR_CACHE_CONTROL;
}
