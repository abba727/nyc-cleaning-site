import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("CMS email links", () => {
  it("has a secure absolute production origin for invitations and password resets", () => {
    expect(ENV.appBaseUrl).toMatch(/^https:\/\/[a-z0-9.-]+$/i);
    expect(new URL("/admin/register?token=test", ENV.appBaseUrl).origin).toBe("https://www.nyccleaning.co");
    expect(new URL("/admin/reset-password?token=test", ENV.appBaseUrl).origin).toBe("https://www.nyccleaning.co");
  });
});
