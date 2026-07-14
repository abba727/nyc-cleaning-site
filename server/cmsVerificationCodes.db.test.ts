import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({ getDb: getDbMock }));

import {
  acceptInvitation,
  completePasswordReset,
  createInvitation,
} from "./cmsDb";
import {
  hashVerificationCode,
  MAX_CODE_ATTEMPTS,
} from "./cmsAuth";

function selectChain(result: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

function updateChain(result: unknown = [{ affectedRows: 1 }]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn().mockResolvedValue(result);
  return chain;
}

function credential(email: string) {
  return {
    userId: 42,
    name: "Editor",
    role: "content_manager",
    isPrimaryAdmin: false,
    deletedAt: null,
    email,
    passwordHash: "existing-password-hash",
    sessionVersion: 1,
    status: "active",
  };
}

describe("verification-code database protections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces the invitation resend cooldown before issuing another code", async () => {
    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(() => selectChain([]))
        .mockImplementationOnce(() => selectChain([{
          resendAvailableAt: new Date(Date.now() + 30_000),
          sendCount: 1,
        }])),
      transaction: vi.fn(),
    };
    getDbMock.mockResolvedValue(db);

    await expect(createInvitation({
      email: "editor@example.com",
      role: "content_manager",
      actorUserId: 1,
    })).rejects.toThrow("CODE_RESEND_COOLDOWN");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("revokes a superseded pending invitation before inserting the new code", async () => {
    const invitationUpdate = updateChain();
    const insertedValues: unknown[] = [];
    const tx = {
      update: vi.fn(() => invitationUpdate),
      insert: vi.fn(() => ({
        values: vi.fn((value: unknown) => {
          insertedValues.push(value);
          return Promise.resolve();
        }),
      })),
    };
    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(() => selectChain([]))
        .mockImplementationOnce(() => selectChain([{
          resendAvailableAt: new Date(Date.now() - 1_000),
          sendCount: 2,
        }])),
      transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx)),
    };
    getDbMock.mockResolvedValue(db);

    const result = await createInvitation({
      email: "EDITOR@example.com",
      role: "admin",
      actorUserId: 1,
    });

    expect(result.code).toMatch(/^\d{6}$/);
    expect(invitationUpdate.set).toHaveBeenCalledWith(expect.objectContaining({ status: "revoked" }));
    expect(insertedValues[0]).toEqual(expect.objectContaining({
      email: "editor@example.com",
      role: "admin",
      attemptCount: 0,
      sendCount: 3,
    }));
  });

  it("expires an invitation record and refuses an expired code", async () => {
    const expirationUpdate = updateChain();
    const db = {
      select: vi.fn(() => selectChain([{
        id: 7,
        email: "editor@example.com",
        status: "pending",
        expiresAt: new Date(Date.now() - 1_000),
      }])),
      update: vi.fn(() => expirationUpdate),
      transaction: vi.fn(),
    };
    getDbMock.mockResolvedValue(db);

    await expect(acceptInvitation({
      email: "editor@example.com",
      code: "123456",
      name: "Editor",
      passwordHash: "new-password-hash",
    })).rejects.toThrow("INVALID_INVITATION");
    expect(expirationUpdate.set).toHaveBeenCalledWith({ status: "expired" });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("increments invitation attempts and blocks records at the attempt limit", async () => {
    const attemptUpdate = updateChain();
    const invitation = {
      id: 8,
      email: "editor@example.com",
      status: "pending",
      codeHash: hashVerificationCode("654321", "invitation", "editor@example.com"),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
    };
    const db = {
      select: vi.fn(() => selectChain([invitation])),
      update: vi.fn(() => attemptUpdate),
      transaction: vi.fn(),
    };
    getDbMock.mockResolvedValue(db);

    await expect(acceptInvitation({
      email: invitation.email,
      code: "000000",
      name: "Editor",
      passwordHash: "new-password-hash",
    })).rejects.toThrow("INVALID_INVITATION");
    expect(attemptUpdate.set).toHaveBeenCalledWith({ attemptCount: expect.anything() });

    invitation.attemptCount = MAX_CODE_ATTEMPTS;
    await expect(acceptInvitation({
      email: invitation.email,
      code: "654321",
      name: "Editor",
      passwordHash: "new-password-hash",
    })).rejects.toThrow("CODE_ATTEMPTS_EXCEEDED");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invitation replay when atomic code consumption affects no row", async () => {
    const code = "234567";
    const consumeUpdate = updateChain([{ affectedRows: 0 }]);
    const tx = {
      update: vi.fn(() => consumeUpdate),
    };
    const db = {
      select: vi.fn(() => selectChain([{
        id: 9,
        email: "editor@example.com",
        role: "content_manager",
        status: "pending",
        codeHash: hashVerificationCode(code, "invitation", "editor@example.com"),
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 0,
      }])),
      transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx)),
    };
    getDbMock.mockResolvedValue(db);

    await expect(acceptInvitation({
      email: "editor@example.com",
      code,
      name: "Editor",
      passwordHash: "new-password-hash",
    })).rejects.toThrow("INVALID_INVITATION");
    expect(tx.update).toHaveBeenCalledTimes(1);
  });

  it("increments reset attempts and rejects an atomic reset-code replay", async () => {
    const email = "editor@example.com";
    const code = "345678";
    const reset = {
      id: 10,
      userId: 42,
      codeHash: hashVerificationCode(code, "password_reset", email),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      usedAt: null,
      revokedAt: null,
    };
    const attemptUpdate = updateChain();
    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(() => selectChain([credential(email)]))
        .mockImplementationOnce(() => selectChain([reset])),
      update: vi.fn(() => attemptUpdate),
      transaction: vi.fn(),
    };
    getDbMock.mockResolvedValue(db);

    await expect(completePasswordReset({
      email,
      code: "000000",
      passwordHash: "replacement-hash",
    })).rejects.toThrow("INVALID_RESET");
    expect(attemptUpdate.set).toHaveBeenCalledWith({ attemptCount: expect.anything() });

    const replayConsume = updateChain([{ affectedRows: 0 }]);
    const replayTx = { update: vi.fn(() => replayConsume) };
    const replayDb = {
      select: vi
        .fn()
        .mockImplementationOnce(() => selectChain([credential(email)]))
        .mockImplementationOnce(() => selectChain([reset])),
      transaction: vi.fn(async (callback: (transaction: typeof replayTx) => Promise<void>) => callback(replayTx)),
    };
    getDbMock.mockResolvedValue(replayDb);

    await expect(completePasswordReset({
      email,
      code,
      passwordHash: "replacement-hash",
    })).rejects.toThrow("INVALID_RESET");
    expect(replayTx.update).toHaveBeenCalledTimes(1);
  });
});
