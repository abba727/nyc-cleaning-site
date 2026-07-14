import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const cmsDbMocks = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  changeCmsUserRole: vi.fn(),
  completePasswordReset: vi.fn(),
  createInvitation: vi.fn(),
  createPasswordReset: vi.fn(),
  createPrimaryAdminSetup: vi.fn(),
  getCredentialByEmail: vi.fn(),
  getInvitationByToken: vi.fn(),
  listCmsUsersAndInvitations: vi.fn(),
  recordLoginResult: vi.fn(),
  removeCmsUser: vi.fn(),
  revokeInvitation: vi.fn(),
}));

const emailMocks = vi.hoisted(() => ({
  sendInvitationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPrimaryAdminSetupEmail: vi.fn(),
}));

vi.mock("./cmsDb", () => cmsDbMocks);
vi.mock("./cmsEmail", () => emailMocks);

import { appRouter } from "./routers";

function context(role: "admin" | "content_manager" | null, id = 2): TrpcContext {
  return {
    user: role ? ({
      id,
      openId: `cms:${id}`,
      name: role === "admin" ? "CMS Admin" : "Content Editor",
      email: `${role}@example.com`,
      role,
      isPrimaryAdmin: false,
      sessionVersion: 1,
    } as NonNullable<TrpcContext["user"]>) : null,
    req: {
      protocol: "https",
      headers: { host: "cms.example.com" },
      get: (name: string) => name.toLowerCase() === "host" ? "cms.example.com" : undefined,
    } as unknown as TrpcContext["req"],
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("CMS user-management procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a single-use invitation and emails the generated registration URL", async () => {
    cmsDbMocks.createInvitation.mockResolvedValue({
      email: "new.editor@example.com",
      role: "content_manager",
      token: "a".repeat(64),
    });
    emailMocks.sendInvitationEmail.mockResolvedValue(undefined);

    const result = await appRouter.createCaller(context("admin")).cmsUsers.invite({
      email: " New.Editor@Example.com ",
      role: "content_manager",
    });

    expect(result).toEqual({ success: true });
    expect(cmsDbMocks.createInvitation).toHaveBeenCalledWith({
      email: "new.editor@example.com",
      role: "content_manager",
      actorUserId: 2,
    });
    expect(emailMocks.sendInvitationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "new.editor@example.com",
      setupUrl: expect.stringMatching(/\/admin\/register\?token=a{64}$/),
    }));
  });

  it("rejects invitations for active accounts without sending email", async () => {
    cmsDbMocks.createInvitation.mockRejectedValue(new Error("USER_ALREADY_ACTIVE"));
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.cmsUsers.invite({ email: "existing@example.com", role: "admin" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "An active user already exists with that email address." });
    expect(emailMocks.sendInvitationEmail).not.toHaveBeenCalled();
  });

  it("protects the primary administrator from demotion and deletion", async () => {
    cmsDbMocks.changeCmsUserRole.mockRejectedValue(new Error("PRIMARY_ADMIN_PROTECTED"));
    cmsDbMocks.removeCmsUser.mockRejectedValue(new Error("PRIMARY_ADMIN_PROTECTED"));
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.cmsUsers.changeRole({ userId: 1, role: "content_manager" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.cmsUsers.remove({ userId: 1 }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(cmsDbMocks.changeCmsUserRole).toHaveBeenCalledOnce();
    expect(cmsDbMocks.removeCmsUser).toHaveBeenCalledOnce();
  });

  it("prevents administrators from changing or deleting their own account", async () => {
    const caller = appRouter.createCaller(context("admin", 2));
    await expect(caller.cmsUsers.changeRole({ userId: 2, role: "content_manager" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.cmsUsers.remove({ userId: 2 }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("CMS password recovery privacy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the same generic success response for an unknown email and sends nothing", async () => {
    cmsDbMocks.createPasswordReset.mockResolvedValue(null);
    cmsDbMocks.createPrimaryAdminSetup.mockResolvedValue(null);
    const result = await appRouter.createCaller(context(null)).auth.forgotPassword({ email: "unknown@example.com" });

    expect(result).toEqual({
      success: true,
      message: "If an active account matches that email, a password-reset link has been sent.",
    });
    expect(cmsDbMocks.createPasswordReset).toHaveBeenCalledWith("unknown@example.com");
    expect(emailMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(emailMocks.sendPrimaryAdminSetupEmail).not.toHaveBeenCalled();
  });

  it("sends a single-use setup invitation for the disabled primary administrator without changing the generic response", async () => {
    cmsDbMocks.createPasswordReset.mockResolvedValue(null);
    cmsDbMocks.createPrimaryAdminSetup.mockResolvedValue({
      email: "albert.aranbaev@gmail.com",
      role: "admin",
      token: "p".repeat(64),
    });

    const result = await appRouter.createCaller(context(null)).auth.forgotPassword({ email: "albert.aranbaev@gmail.com" });

    expect(result.message).toBe("If an active account matches that email, a password-reset link has been sent.");
    expect(emailMocks.sendPrimaryAdminSetupEmail).toHaveBeenCalledWith({
      to: "albert.aranbaev@gmail.com",
      setupUrl: expect.stringMatching(/\/admin\/register\?token=p{64}$/),
    });
  });
});
