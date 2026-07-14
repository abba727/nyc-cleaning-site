import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { accountAdminProcedure, contentProcedure, router } from "./_core/trpc";

const testRouter = router({
  editArticle: contentProcedure.query(() => "article-ok"),
  manageUsers: accountAdminProcedure.query(() => "users-ok"),
});

function context(role: "admin" | "content_manager" | "user" | null): TrpcContext {
  return {
    user: role ? ({
      id: 1,
      openId: "cms:test",
      name: "CMS User",
      email: "cms@example.com",
      role,
      isPrimaryAdmin: role === "admin",
      sessionVersion: 1,
    } as NonNullable<TrpcContext["user"]>) : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("CMS role permission boundaries", () => {
  it("allows Content Managers to edit articles but not manage accounts", async () => {
    const caller = testRouter.createCaller(context("content_manager"));
    await expect(caller.editArticle()).resolves.toBe("article-ok");
    await expect(caller.manageUsers()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows Admins to edit articles and manage accounts", async () => {
    const caller = testRouter.createCaller(context("admin"));
    await expect(caller.editArticle()).resolves.toBe("article-ok");
    await expect(caller.manageUsers()).resolves.toBe("users-ok");
  });

  it("rejects unsigned and non-CMS users from CMS procedures", async () => {
    await expect(testRouter.createCaller(context(null)).editArticle()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(testRouter.createCaller(context("user")).editArticle()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
