import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cloudBuildConfig = readFileSync(resolve(process.cwd(), "cloudbuild.yaml"), "utf8");

describe("Resend production configuration", () => {
  it("declares a verified NYC Cleaning sender for the deployed service", () => {
    expect(cloudBuildConfig).toContain("_RESEND_FROM_EMAIL: NYC Cleaning <notifications@nyccleaning.co>");
    expect(cloudBuildConfig).toContain("RESEND_FROM_EMAIL=${_RESEND_FROM_EMAIL}");
    expect(cloudBuildConfig).not.toContain("onboarding@resend.dev");
  });

  it("injects the Resend API key into the deployed service through Secret Manager", () => {
    expect(cloudBuildConfig).toContain("_RESEND_API_KEY_SECRET: nyc-cleaning-resend-api-key");
    expect(cloudBuildConfig).toContain("RESEND_API_KEY=${_RESEND_API_KEY_SECRET}:latest");
  });
});
