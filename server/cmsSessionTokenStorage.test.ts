import { describe, expect, it, vi } from "vitest";
import {
  clearCmsSessionToken,
  CMS_SESSION_TOKEN_KEY,
  getCmsSessionExpiration,
  readCmsSessionToken,
  storeCmsSessionToken,
} from "../client/src/lib/cmsSessionToken";

function storage(initialValue: string | null = null) {
  return {
    getItem: vi.fn(() => initialValue),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
}

describe("CMS bearer session storage", () => {
  it("stores short sessions only in sessionStorage", () => {
    const session = storage();
    const local = storage();

    storeCmsSessionToken(session, local, "short-token", false);

    expect(session.setItem).toHaveBeenCalledWith(CMS_SESSION_TOKEN_KEY, "short-token");
    expect(local.setItem).not.toHaveBeenCalled();
  });

  it("stores remembered sessions only in localStorage", () => {
    const session = storage();
    const local = storage();

    storeCmsSessionToken(session, local, "remembered-token", true);

    expect(local.setItem).toHaveBeenCalledWith(CMS_SESSION_TOKEN_KEY, "remembered-token");
    expect(session.setItem).not.toHaveBeenCalled();
  });

  it("prefers a tab-scoped token and falls back to the remembered token", () => {
    expect(readCmsSessionToken(storage("tab-token"), storage("remembered-token"))).toBe("tab-token");
    expect(readCmsSessionToken(storage(null), storage("remembered-token"))).toBe("remembered-token");
  });

  it("clears both storage locations during logout", () => {
    const session = storage();
    const local = storage();

    clearCmsSessionToken(session, local);

    expect(session.removeItem).toHaveBeenCalledWith(CMS_SESSION_TOKEN_KEY);
    expect(local.removeItem).toHaveBeenCalledWith(CMS_SESSION_TOKEN_KEY);
  });

  it("reads the expiration timestamp from a signed JWT payload and rejects malformed tokens", () => {
    const payload = Buffer.from(JSON.stringify({ exp: 1_900_000_000 })).toString("base64url");
    expect(getCmsSessionExpiration(`header.${payload}.signature`)).toBe(1_900_000_000_000);
    expect(getCmsSessionExpiration("not-a-jwt")).toBeNull();
  });
});
