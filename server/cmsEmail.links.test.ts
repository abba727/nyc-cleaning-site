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

import { sendInquiryNotification, sendInquiryReply, sendInvitationEmail, sendPasswordResetEmail, sendPrimaryAdminSetupEmail } from "./cmsEmail";

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

describe("inquiry emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ data: { id: "message-1" }, error: null });
  });

  it("routes every website inquiry to the company inbox with the submitter as reply-to", async () => {
    await sendInquiryNotification({ inquiryId: 731, inquiryType: "quote", name: "Jordan Rivera", email: "jordan@example.com", phone: "(212) 555-0198", serviceType: "Commercial Cleaning", message: "Please contact me about weekday office cleaning.", sourcePath: "/commercial-cleaning-services/" });
    const payload = sendMock.mock.calls[0][0] as { to: string; replyTo: string; subject: string; text: string; html: string };
    expect(payload.to).toBe("info@fcmre.com");
    expect(payload.replyTo).toBe("jordan@example.com");
    expect(payload.subject).toContain("Jordan Rivera");
    expect(payload.text).toContain("(212) 555-0198");
    expect(payload.text).toContain("weekday office cleaning");
    expect(payload.html).toContain("NYC Cleaning website inquiry");
  });

  it("sends a CMS reply to the saved customer and directs later replies to the company inbox", async () => {
    await sendInquiryReply({ to: "jordan@example.com", customerName: "Jordan Rivera", subject: "Your cleaning request", message: "Thank you for contacting us. We can help." });
    const payload = sendMock.mock.calls[0][0] as { to: string; replyTo: string; text: string };
    expect(payload.to).toBe("jordan@example.com");
    expect(payload.replyTo).toBe("info@nyccleaning.co");
    expect(payload.text).toContain("Thank you for contacting us");
  });
});
