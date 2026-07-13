import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  countRecentInquiriesByEmail: vi.fn(),
  createInquiry: vi.fn(),
  updateInquiryNotificationStatus: vi.fn(),
}));
const notificationMocks = vi.hoisted(() => ({ notifyOwner: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./_core/notification", () => notificationMocks);

import { appRouter } from "./routers";

function context(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const validInput = {
  inquiryType: "quote" as const,
  name: "Jordan Rivera",
  email: "jordan@example.com",
  phone: "(212) 555-0198",
  serviceType: "Commercial Cleaning",
  message: "Please contact me about weekday office cleaning.",
  sourcePath: "/commercial-cleaning-services/",
  website: "",
};

describe("inquiry.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.countRecentInquiriesByEmail.mockResolvedValue(0);
    dbMocks.createInquiry.mockResolvedValue(731);
    dbMocks.updateInquiryNotificationStatus.mockResolvedValue(undefined);
    notificationMocks.notifyOwner.mockResolvedValue(true);
  });

  it("persists a valid inquiry and sends complete owner details", async () => {
    const result = await appRouter.createCaller(context()).inquiry.submit(validInput);

    expect(result).toEqual({ success: true, inquiryId: 731, notificationSent: true });
    expect(dbMocks.createInquiry).toHaveBeenCalledWith(expect.objectContaining({
      name: validInput.name,
      email: validInput.email,
      phone: validInput.phone,
      serviceType: validInput.serviceType,
      message: validInput.message,
      notificationStatus: "pending",
    }));
    expect(notificationMocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining(validInput.name),
      content: expect.stringMatching(/Name: Jordan Rivera[\s\S]*Email: jordan@example.com[\s\S]*Phone: \(212\) 555-0198[\s\S]*Service interest: Commercial Cleaning/),
    }));
    expect(dbMocks.updateInquiryNotificationStatus).toHaveBeenCalledWith(731, "sent");
  });

  it("keeps a persisted inquiry when owner notification delivery fails", async () => {
    notificationMocks.notifyOwner.mockResolvedValue(false);
    const result = await appRouter.createCaller(context()).inquiry.submit(validInput);

    expect(result.notificationSent).toBe(false);
    expect(dbMocks.createInquiry).toHaveBeenCalledTimes(1);
    expect(dbMocks.updateInquiryNotificationStatus).toHaveBeenCalledWith(731, "failed");
  });

  it("rejects honeypot submissions before database access", async () => {
    await expect(appRouter.createCaller(context()).inquiry.submit({ ...validInput, website: "spam.example" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createInquiry).not.toHaveBeenCalled();
  });

  it("throttles repeated submissions from the same email", async () => {
    dbMocks.countRecentInquiriesByEmail.mockResolvedValue(3);
    await expect(appRouter.createCaller(context()).inquiry.submit(validInput)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(dbMocks.createInquiry).not.toHaveBeenCalled();
  });

  it("rejects incomplete or malformed visitor details", async () => {
    await expect(appRouter.createCaller(context()).inquiry.submit({ ...validInput, email: "not-an-email", message: "short" })).rejects.toBeTruthy();
    expect(dbMocks.createInquiry).not.toHaveBeenCalled();
  });
});
