import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    resendApiKey: "test-key",
    resendFromEmail: "NYC Cleaning <cms@nyccleaning.co>",
  },
}));

import { sendInvitationEmail, sendPasswordResetEmail, sendPrimaryAdminSetupEmail } from "./cmsEmail";

describe("CMS verification-code emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ data: { id: "message-1" }, error: null });
  });

  it.each([
    ["invitation", () => sendInvitationEmail({ to: "editor@example.com", role: "content_manager", code: "042817" })],
    ["password reset", () => sendPasswordResetEmail({ to: "editor@example.com", code: "042817" })],
    ["primary administrator setup", () => sendPrimaryAdminSetupEmail({ to: "editor@example.com", code: "042817" })],
  ])("sends the %s code with expiry and single-use guidance but no authentication link", async (_name, send) => {
    await send();
    const payload = sendMock.mock.calls[0][0] as { text: string; html: string; to: string };
    expect(payload.to).toBe("editor@example.com");
    expect(payload.text).toContain("042817");
    expect(payload.html).toContain("042817");
    expect(payload.text).toContain("expires in 10 minutes");
    expect(payload.text).toContain("used once");
    expect(payload.text).not.toMatch(/https?:\/\//i);
    expect(payload.html).not.toMatch(/href=|token=/i);
  });
});
