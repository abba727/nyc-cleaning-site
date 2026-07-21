import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  deleteProjectLocation: vi.fn(),
  deleteProjectLocations: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";

function context(role: "admin" | "content_manager" | "user" | null = "admin"): TrpcContext {
  return {
    user: role ? ({
      id: 7,
      openId: "cms:7",
      name: "CMS User",
      email: "cms@nyccleaning.co",
      role,
      isPrimaryAdmin: role === "admin",
      sessionVersion: 1,
    } as NonNullable<TrpcContext["user"]>) : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Projects bulk-removal procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.deleteProjectLocations.mockResolvedValue(undefined);
  });

  it("removes selected locations in one deduplicated database operation", async () => {
    const result = await appRouter.createCaller(context()).projects.removeMany({ ids: [11, 23, 11] });

    expect(result).toEqual({ success: true, removedCount: 2 });
    expect(dbMocks.deleteProjectLocations).toHaveBeenCalledTimes(1);
    expect(dbMocks.deleteProjectLocations).toHaveBeenCalledWith([11, 23]);
  });

  it("allows a content manager to remove selected locations but rejects ordinary users", async () => {
    await expect(appRouter.createCaller(context("content_manager")).projects.removeMany({ ids: [11, 23] }))
      .resolves.toEqual({ success: true, removedCount: 2 });
    await expect(appRouter.createCaller(context("user")).projects.removeMany({ ids: [11] }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an empty selection before the database helper runs", async () => {
    await expect(appRouter.createCaller(context()).projects.removeMany({ ids: [] })).rejects.toBeTruthy();
    expect(dbMocks.deleteProjectLocations).not.toHaveBeenCalled();
  });
});
