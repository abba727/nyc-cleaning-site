import { describe, expect, it } from "vitest";
import {
  PRIVATE_SSR_CACHE_CONTROL,
  PUBLIC_SSR_CACHE_CONTROL,
  getSsrCacheControl,
} from "./publicSsrCache";

describe("public SSR cache policy", () => {
  it("gives successful public documents a short shared cache lifetime", () => {
    expect(getSsrCacheControl({ method: "GET", originalUrl: "/", status: 200 })).toBe(PUBLIC_SSR_CACHE_CONTROL);
    expect(getSsrCacheControl({ method: "GET", originalUrl: "/commercial-cleaning/?utm_source=search", status: 200 })).toBe(PUBLIC_SSR_CACHE_CONTROL);
    expect(getSsrCacheControl({ method: "GET", originalUrl: "/cms-article/", status: 200 })).toBe(PUBLIC_SSR_CACHE_CONTROL);
  });

  it("does not cache admin, API, form-success, error, or non-GET responses", () => {
    expect(getSsrCacheControl({ method: "GET", originalUrl: "/admin/", status: 200 })).toBe(PRIVATE_SSR_CACHE_CONTROL);
    expect(getSsrCacheControl({ method: "GET", originalUrl: "/api/homepage-insights", status: 200 })).toBe(PRIVATE_SSR_CACHE_CONTROL);
    expect(getSsrCacheControl({ method: "GET", originalUrl: "/thank-you/", status: 200 })).toBe(PRIVATE_SSR_CACHE_CONTROL);
    expect(getSsrCacheControl({ method: "GET", originalUrl: "/missing-page/", status: 404 })).toBe(PRIVATE_SSR_CACHE_CONTROL);
    expect(getSsrCacheControl({ method: "POST", originalUrl: "/", status: 200 })).toBe(PRIVATE_SSR_CACHE_CONTROL);
  });
});
