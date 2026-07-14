import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  countRecentInquiriesByEmail: vi.fn(),
  createArticle: vi.fn(),
  createInquiry: vi.fn(),
  deleteArticle: vi.fn(),
  getPublishedArticleByPath: vi.fn(),
  listAllArticles: vi.fn(),
  listPublishedArticles: vi.fn(),
  updateArticle: vi.fn(),
  updateInquiryNotificationStatus: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({ storagePut: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./storage", () => storageMocks);
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));

import { appRouter } from "./routers";
import { ENV } from "./_core/env";

type User = NonNullable<TrpcContext["user"]>;

const user = (overrides: Partial<User> = {}): User => ({
  id: 1,
  openId: "ordinary-user",
  email: "editor@example.com",
  name: "Article Editor",
  loginMethod: "password",
  role: "user",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const context = (currentUser: User | null): TrpcContext => ({
  user: currentUser,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
});

const validArticle = {
  path: "/building-cleaning-guide/",
  slug: "building-cleaning-guide",
  title: "A Practical Building Cleaning Guide",
  excerpt: "A practical guide for maintaining cleaner New York buildings.",
  body: [{ type: "p" as const, text: "Start with a documented scope and a realistic service schedule." }],
  seoTitle: "Building Cleaning Guide | NYC Cleaning",
  metaDescription: "Learn how to plan a practical cleaning program for a New York property.",
  authorName: "NYC Cleaning and Maintenance",
  coverImageUrl: "/manus-storage/building-cleaning-guide.png",
  coverImageKey: "article-covers/owner/building-cleaning-guide.png",
  coverImageAlt: "A professionally maintained New York building lobby",
  sourceUrl: "",
  status: "draft" as const,
  publishedAt: null,
};

describe("article CMS authorization and contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes public canonical paths and only uses the published-article lookup", async () => {
    dbMocks.getPublishedArticleByPath.mockResolvedValue(null);
    const caller = appRouter.createCaller(context(null));

    await expect(caller.article.byPath({ path: "building-cleaning-guide" })).resolves.toBeNull();
    expect(dbMocks.getPublishedArticleByPath).toHaveBeenCalledWith("/building-cleaning-guide/");
  });

  it("denies ordinary authenticated users from the administrative article list", async () => {
    const caller = appRouter.createCaller(context(user({ openId: `${ENV.ownerOpenId || "owner"}-not-owner` })));
    await expect(caller.article.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.listAllArticles).not.toHaveBeenCalled();
  });

  it("permits an authenticated CMS administrator to manage articles", async () => {
    dbMocks.listAllArticles.mockResolvedValue([]);
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "admin" })));

    await expect(caller.auth.me()).resolves.toMatchObject({ role: "admin" });
    await expect(caller.article.adminList()).resolves.toEqual([]);
  });

  it("permits a content manager to create articles", async () => {
    dbMocks.createArticle.mockResolvedValue(501);
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    await expect(caller.article.create(validArticle)).resolves.toEqual({ success: true, id: 501 });
    expect(dbMocks.createArticle).toHaveBeenCalledWith(expect.objectContaining({
      description: validArticle.excerpt,
      blocks: validArticle.body,
      excerpt: validArticle.excerpt,
      body: validArticle.body,
      createdByOpenId: ENV.ownerOpenId,
      status: "draft",
      publishedAt: null,
    }));
  });

  it("uploads CMS cover images to deployment-safe object storage", async () => {
    storageMocks.storagePut.mockResolvedValue({
      key: "article-covers/owner/lobby-cover.png",
      url: "/manus-storage/lobby-cover.png",
    });
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    const result = await caller.article.uploadCover({
      fileName: "Lobby Cover.png",
      mimeType: "image/png",
      base64: Buffer.from("valid image bytes").toString("base64"),
    });

    expect(result.url).toBe("/manus-storage/lobby-cover.png");
    expect(storageMocks.storagePut).toHaveBeenCalledWith(
      `article-covers/${ENV.ownerOpenId}/lobby-cover.png`,
      expect.any(Buffer),
      "image/png",
    );
  });
});
