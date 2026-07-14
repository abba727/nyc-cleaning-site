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
import { hashPassword } from "./cmsAuth";

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

  it("creates a single-use invitation and emails the generated six-digit code", async () => {
    cmsDbMocks.createInvitation.mockResolvedValue({
      email: "new.editor@example.com",
      role: "content_manager",
      code: "042817",
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
      role: "content_manager",
      code: "042817",
    }));
  });

  it("keeps invitation issuance and resend administrator-only", async () => {
    const caller = appRouter.createCaller(context("content_manager"));
    await expect(caller.cmsUsers.invite({ email: "new.editor@example.com", role: "content_manager" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.cmsUsers.resendInvitation({ invitationId: 7 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(cmsDbMocks.createInvitation).not.toHaveBeenCalled();
  });

  it("maps invitation resend cooldowns to a rate-limit response", async () => {
    cmsDbMocks.listCmsUsersAndInvitations.mockResolvedValue({
      users: [],
      invitations: [{ id: 7, email: "new.editor@example.com", role: "content_manager" }],
    });
    cmsDbMocks.createInvitation.mockRejectedValue(new Error("CODE_RESEND_COOLDOWN"));
    await expect(appRouter.createCaller(context("admin")).cmsUsers.resendInvitation({ invitationId: 7 }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS", message: "Please wait one minute before requesting another code." });
    expect(emailMocks.sendInvitationEmail).not.toHaveBeenCalled();
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

describe("CMS login token transport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the signed session token and requested persistence mode after valid credentials", async () => {
    cmsDbMocks.getCredentialByEmail.mockResolvedValue({
      userId: 12,
      email: "editor@example.com",
      name: "Editor",
      role: "content_manager",
      status: "active",
      isPrimaryAdmin: false,
      passwordHash: await hashPassword("ValidPassword!"),
      deletedAt: null,
      sessionVersion: 4,
    });
    cmsDbMocks.recordLoginResult.mockResolvedValue(undefined);

    const result = await appRouter.createCaller(context(null)).auth.login({
      email: "editor@example.com",
      password: "ValidPassword!",
      rememberMe: true,
    });

    expect(result).toMatchObject({
      success: true,
      token: expect.any(String),
      rememberMe: true,
    });
    expect(result.token.split(".")).toHaveLength(3);
    expect(cmsDbMocks.recordLoginResult).toHaveBeenCalledWith({
      userId: 12,
      email: "editor@example.com",
      success: true,
    });
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
      message: "If an eligible account matches that email, a six-digit verification code has been sent.",
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
      code: "819204",
    });

    const result = await appRouter.createCaller(context(null)).auth.forgotPassword({ email: "albert.aranbaev@gmail.com" });

    expect(result.message).toBe("If an eligible account matches that email, a six-digit verification code has been sent.");
    expect(emailMocks.sendPrimaryAdminSetupEmail).toHaveBeenCalledWith({
      to: "albert.aranbaev@gmail.com",
      code: "819204",
    });
  });

  it("keeps the generic response when primary-administrator setup is requested during the resend cooldown", async () => {
    cmsDbMocks.createPasswordReset.mockResolvedValue(null);
    cmsDbMocks.createPrimaryAdminSetup.mockRejectedValue(new Error("CODE_RESEND_COOLDOWN"));

    const result = await appRouter.createCaller(context(null)).auth.forgotPassword({
      email: "albert.aranbaev@gmail.com",
    });

    expect(result).toEqual({
      success: true,
      message: "If an eligible account matches that email, a six-digit verification code has been sent.",
    });
    expect(emailMocks.sendPrimaryAdminSetupEmail).not.toHaveBeenCalled();
  });
});

describe("CMS password code completion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("completes a normal active-account password reset with the simplified password policy", async () => {
    cmsDbMocks.getCredentialByEmail.mockResolvedValue({
      userId: 8,
      email: "editor@example.com",
      name: "Editor",
      role: "content_manager",
      status: "active",
      isPrimaryAdmin: false,
      passwordHash: "existing-hash",
      deletedAt: null,
    });
    cmsDbMocks.completePasswordReset.mockResolvedValue({ success: true });

    await expect(appRouter.createCaller(context(null)).auth.resetPassword({
      email: "editor@example.com",
      code: "276858",
      password: "Abcdefg!",
    })).resolves.toEqual({ success: true });

    expect(cmsDbMocks.completePasswordReset).toHaveBeenCalledWith(expect.objectContaining({
      email: "editor@example.com",
      code: "276858",
      passwordHash: expect.stringMatching(/^\$argon2id\$/),
    }));
    expect(cmsDbMocks.acceptInvitation).not.toHaveBeenCalled();
  });

  it("uses a primary-administrator setup code from the reset screen when that account is not yet active", async () => {
    cmsDbMocks.getCredentialByEmail.mockResolvedValue({
      userId: 1,
      email: "albert.aranbaev@gmail.com",
      name: "Albert Aranbaev",
      role: "admin",
      status: "invited",
      isPrimaryAdmin: true,
      passwordHash: null,
      deletedAt: null,
    });
    cmsDbMocks.acceptInvitation.mockResolvedValue({ id: 1, sessionVersion: 1 });

    await expect(appRouter.createCaller(context(null)).auth.resetPassword({
      email: "albert.aranbaev@gmail.com",
      code: "276858",
      password: "Abcdefg!",
    })).resolves.toEqual({ success: true });

    expect(cmsDbMocks.acceptInvitation).toHaveBeenCalledWith(expect.objectContaining({
      email: "albert.aranbaev@gmail.com",
      code: "276858",
      name: "Albert Aranbaev",
      passwordHash: expect.stringMatching(/^\$argon2id\$/),
    }));
    expect(cmsDbMocks.completePasswordReset).not.toHaveBeenCalled();
  });

  it("rejects passwords without both an uppercase letter and a special character", async () => {
    await expect(appRouter.createCaller(context(null)).auth.resetPassword({
      email: "editor@example.com",
      code: "276858",
      password: "lowercase!",
    })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Use at least 8 characters with one uppercase letter and one special character.",
    });

    expect(cmsDbMocks.getCredentialByEmail).not.toHaveBeenCalled();
    expect(cmsDbMocks.completePasswordReset).not.toHaveBeenCalled();
    expect(cmsDbMocks.acceptInvitation).not.toHaveBeenCalled();
  });
});
