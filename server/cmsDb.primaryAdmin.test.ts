import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => dbMocks);

import { createPrimaryAdminSetup } from "./cmsDb";

function selectChain(result: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

describe("primary administrator bootstrap", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upgrades an existing legacy user without credentials before creating setup access", async () => {
    const credential = {
      userId: 1,
      name: "Albert Aranbaev",
      role: "admin",
      isPrimaryAdmin: true,
      deletedAt: null,
      email: "albert.aranbaev@gmail.com",
      passwordHash: null,
      sessionVersion: 1,
      status: "pending",
    };
    const insertedValues: unknown[] = [];
    const updateValues: unknown[] = [];
    const db = {
      select: vi.fn()
        .mockImplementationOnce(() => selectChain([]))
        .mockImplementationOnce(() => selectChain([{ id: 1 }]))
        .mockImplementationOnce(() => selectChain([credential]))
        .mockImplementationOnce(() => selectChain([credential])),
      update: vi.fn(() => ({
        set: vi.fn((values: unknown) => {
          updateValues.push(values);
          return { where: vi.fn().mockResolvedValue(undefined) };
        }),
      })),
      insert: vi.fn(() => ({
        values: vi.fn((values: unknown) => {
          insertedValues.push(values);
          return { $returningId: vi.fn().mockResolvedValue([{ id: 1 }]) };
        }),
      })),
      transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => callback(db)),
    };
    dbMocks.getDb.mockResolvedValue(db);

    const setup = await createPrimaryAdminSetup("albert.aranbaev@gmail.com");

    expect(updateValues).toContainEqual(expect.objectContaining({
      loginMethod: "password",
      role: "admin",
      isPrimaryAdmin: true,
      deletedAt: null,
    }));
    expect(insertedValues).toContainEqual({
      userId: 1,
      email: "albert.aranbaev@gmail.com",
      status: "pending",
    });
    expect(setup).toEqual(expect.objectContaining({
      email: "albert.aranbaev@gmail.com",
      role: "admin",
      token: expect.any(String),
      expiresAt: expect.any(Date),
    }));
    expect(setup?.token).toHaveLength(43);
  });
});
