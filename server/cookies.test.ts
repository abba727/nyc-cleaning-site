import { describe, expect, it } from "vitest";

import { getSessionCookieOptions } from "./_core/cookies";

function request(protocol: string, forwardedProto?: string) {
  return {
    protocol,
    headers: forwardedProto ? { "x-forwarded-proto": forwardedProto } : {},
  } as Parameters<typeof getSessionCookieOptions>[0];
}

describe("CMS session cookie policy", () => {
  it("uses a secure cross-site cookie for direct HTTPS requests", () => {
    expect(getSessionCookieOptions(request("https"))).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });

  it("recognizes HTTPS forwarded by the hosting proxy", () => {
    expect(getSessionCookieOptions(request("http", "http, https"))).toMatchObject({
      sameSite: "none",
      secure: true,
    });
  });

  it("uses a browser-compatible lax cookie for local HTTP development", () => {
    expect(getSessionCookieOptions(request("http"))).toMatchObject({
      sameSite: "lax",
      secure: false,
    });
  });
});
