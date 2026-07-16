import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  countRecentInquiriesByEmail: vi.fn(), createInquiry: vi.fn(), updateInquiryNotificationStatus: vi.fn(),
  listInquiries: vi.fn(), getInquiryById: vi.fn(), updateInquiryStatus: vi.fn(), createInquiryResponse: vi.fn(),
  updateInquiryResponseDelivery: vi.fn(), markInquiryResponded: vi.fn(),
}));
const notificationMocks = vi.hoisted(() => ({ notifyOwner: vi.fn() }));
const emailMocks = vi.hoisted(() => ({ sendInquiryNotification: vi.fn(), sendInquiryReply: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./_core/notification", () => notificationMocks);
vi.mock("./cmsEmail", () => emailMocks);

import { appRouter } from "./routers";

function context(role: "admin" | "content_manager" | "user" | null = null): TrpcContext {
  return {
    user: role ? ({ id: 7, openId: "cms:7", name: "CMS User", email: "cms@nyccleaning.co", role, isPrimaryAdmin: role === "admin", sessionVersion: 1 } as NonNullable<TrpcContext["user"]>) : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"],
  };
}

const validInput = {
  inquiryType: "quote" as const, name: "Jordan Rivera", email: "jordan@example.com", phone: "(212) 555-0198",
  serviceType: "Commercial Cleaning", message: "Please contact me about weekday office cleaning.", sourcePath: "/commercial-cleaning-services/", website: "",
};
const inquiry = { id: 731, ...validInput, phone: "2125550198", website: undefined, status: "new" as const, notificationStatus: "sent" as const, lastRespondedAt: null, createdAt: new Date(), updatedAt: new Date() };

describe("inquiry CRM procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.countRecentInquiriesByEmail.mockResolvedValue(0);
    dbMocks.createInquiry.mockResolvedValue(731);
    dbMocks.updateInquiryNotificationStatus.mockResolvedValue(undefined);
    dbMocks.listInquiries.mockResolvedValue([inquiry]);
    dbMocks.getInquiryById.mockResolvedValue({ inquiry, responses: [] });
    dbMocks.updateInquiryStatus.mockResolvedValue(undefined);
    dbMocks.createInquiryResponse.mockResolvedValue(91);
    dbMocks.updateInquiryResponseDelivery.mockResolvedValue(undefined);
    dbMocks.markInquiryResponded.mockResolvedValue(undefined);
    notificationMocks.notifyOwner.mockResolvedValue(true);
    emailMocks.sendInquiryNotification.mockResolvedValue({ id: "resend-notification-1" });
    emailMocks.sendInquiryReply.mockResolvedValue({ id: "resend-reply-1" });
  });

  it("normalizes a valid US phone, persists the inquiry, and sends the complete Resend notification", async () => {
    const result = await appRouter.createCaller(context()).inquiry.submit(validInput);
    expect(result).toEqual({ success: true, inquiryId: 731, notificationSent: true });
    expect(dbMocks.createInquiry).toHaveBeenCalledWith(expect.objectContaining({ name: validInput.name, email: validInput.email, phone: "2125550198", notificationStatus: "pending" }));
    expect(emailMocks.sendInquiryNotification).toHaveBeenCalledWith(expect.objectContaining({ inquiryId: 731, email: validInput.email, phone: "(212) 555-0198", message: validInput.message }));
    expect(emailMocks.sendInquiryNotification).toHaveBeenCalledTimes(1);
    expect(notificationMocks.notifyOwner).not.toHaveBeenCalled();
    expect(dbMocks.updateInquiryNotificationStatus).toHaveBeenCalledWith(731, "sent");
  });

  it("keeps the CRM record when Resend delivery fails and records the failure", async () => {
    emailMocks.sendInquiryNotification.mockRejectedValue(new Error("provider unavailable"));
    const result = await appRouter.createCaller(context()).inquiry.submit(validInput);
    expect(result.notificationSent).toBe(false);
    expect(dbMocks.createInquiry).toHaveBeenCalledTimes(1);
    expect(dbMocks.updateInquiryNotificationStatus).toHaveBeenCalledWith(731, "failed");
  });

  it("rejects honeypot, malformed email, short message, and invalid phone submissions before persistence", async () => {
    await expect(appRouter.createCaller(context()).inquiry.submit({ ...validInput, website: "spam.example" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(appRouter.createCaller(context()).inquiry.submit({ ...validInput, email: "not-an-email", message: "short", phone: "123" })).rejects.toBeTruthy();
    expect(dbMocks.createInquiry).not.toHaveBeenCalled();
  });

  it("throttles repeated submissions from the same email", async () => {
    dbMocks.countRecentInquiriesByEmail.mockResolvedValue(3);
    await expect(appRouter.createCaller(context()).inquiry.submit(validInput)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(dbMocks.createInquiry).not.toHaveBeenCalled();
  });

  it("allows both CMS roles to view inquiries but rejects ordinary users", async () => {
    await expect(appRouter.createCaller(context("admin")).inquiry.list()).resolves.toEqual([inquiry]);
    await expect(appRouter.createCaller(context("content_manager")).inquiry.detail({ id: 731 })).resolves.toEqual({ inquiry, responses: [] });
    await expect(appRouter.createCaller(context("user")).inquiry.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("updates CRM status for an authorized CMS user", async () => {
    await expect(appRouter.createCaller(context("content_manager")).inquiry.updateStatus({ id: 731, status: "closed" })).resolves.toEqual({ success: true });
    expect(dbMocks.updateInquiryStatus).toHaveBeenCalledWith(731, "closed");
  });

  it("saves, sends, and records a CMS reply before marking the inquiry contacted", async () => {
    const result = await appRouter.createCaller(context("content_manager")).inquiry.reply({ id: 731, subject: "Your cleaning request", message: "Thank you for contacting us. We can help with this property." });
    expect(result).toEqual({ success: true, responseId: 91 });
    expect(dbMocks.createInquiryResponse).toHaveBeenCalledWith(expect.objectContaining({ inquiryId: 731, recipientEmail: "jordan@example.com", deliveryStatus: "pending" }));
    expect(emailMocks.sendInquiryReply).toHaveBeenCalledWith(expect.objectContaining({ to: "jordan@example.com", customerName: "Jordan Rivera" }));
    expect(dbMocks.updateInquiryResponseDelivery).toHaveBeenCalledWith({ id: 91, deliveryStatus: "sent", providerMessageId: "resend-reply-1" });
    expect(dbMocks.markInquiryResponded).toHaveBeenCalledWith(731);
  });

  it("records a failed CMS reply and returns a readable error", async () => {
    emailMocks.sendInquiryReply.mockRejectedValue(new Error("provider unavailable"));
    await expect(appRouter.createCaller(context("admin")).inquiry.reply({ id: 731, subject: "Your cleaning request", message: "Thank you for contacting us. We will follow up soon." })).rejects.toMatchObject({ message: expect.stringContaining("could not be sent") });
    expect(dbMocks.updateInquiryResponseDelivery).toHaveBeenCalledWith(expect.objectContaining({ id: 91, deliveryStatus: "failed" }));
    expect(dbMocks.markInquiryResponded).not.toHaveBeenCalled();
  });
});
