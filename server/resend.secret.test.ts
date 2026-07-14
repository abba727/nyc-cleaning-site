import { describe, expect, it } from "vitest";
import { Resend } from "resend";

describe("Resend configuration", () => {
  it("uses a configured verified production sender", () => {
    const sender = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
    expect(sender, "RESEND_FROM_EMAIL must be configured").not.toBe("");
    expect(sender).not.toMatch(/onboarding@resend\.dev/i);
  });

  it("authenticates the configured server API key", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey, "RESEND_API_KEY must be configured").toBeTruthy();

    const resend = new Resend(apiKey);
    const response = await resend.domains.list();

    expect(response.error).toBeNull();
    expect(response.data).toBeDefined();
  }, 15_000);
});
