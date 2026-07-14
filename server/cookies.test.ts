import { serialize } from "cookie";
import { describe, expect, it } from "vitest";

import { COOKIE_NAME } from "../shared/const";
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
      partitioned: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });

  it("serializes a secure partitioned cookie that embedded browsers can retain", () => {
    const header = serialize(COOKIE_NAME, "session-token", getSessionCookieOptions(request("https")));

    expect(header).toContain("HttpOnly");
    expect(header).toContain("Partitioned");
    expect(header).toContain("SameSite=None");
    expect(header).toContain("Secure");
  });

  it("recognizes HTTPS forwarded by the hosting proxy", () => {
    expect(getSessionCookieOptions(request("http", "http, https"))).toMatchObject({
      partitioned: true,
      sameSite: "none",
      secure: true,
    });
  });

  it("uses a browser-compatible lax cookie for local HTTP development", () => {
    expect(getSessionCookieOptions(request("http"))).toMatchObject({
      partitioned: false,
      sameSite: "lax",
      secure: false,
    });
  });
});
