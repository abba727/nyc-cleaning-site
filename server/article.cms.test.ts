import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  countRecentInquiriesByEmail: vi.fn(),
  createArticle: vi.fn(),
  createInquiry: vi.fn(),
  deleteArticle: vi.fn(),
  findArticleUrlConflict: vi.fn(),
  getPublishedArticleByPath: vi.fn(),
  listAllArticles: vi.fn(),
  listPublishedArticles: vi.fn(),
  updateArticle: vi.fn(),
  updateInquiryNotificationStatus: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({ storagePut: vi.fn() }));
const imageGenerationMocks = vi.hoisted(() => ({ generateImage: vi.fn() }));
const seoGenerationMocks = vi.hoisted(() => ({ generateArticleSeoFields: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./storage", () => storageMocks);
vi.mock("./_core/imageGeneration", () => imageGenerationMocks);
vi.mock("./articleSeoGeneration", () => seoGenerationMocks);
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
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.findArticleUrlConflict.mockResolvedValue(null);
  });

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
    expect(dbMocks.findArticleUrlConflict).toHaveBeenCalledWith({
      path: validArticle.path,
      slug: validArticle.slug,
      excludeId: undefined,
    });
  });

  it("returns a clear error when another Insight already uses the canonical path", async () => {
    dbMocks.findArticleUrlConflict.mockResolvedValue({ id: 91, path: validArticle.path, slug: "different-slug" });
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    await expect(caller.article.create(validArticle)).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("canonical path is already used"),
    });
    expect(dbMocks.createArticle).not.toHaveBeenCalled();
  });

  it("returns a clear error when another Insight already uses the slug", async () => {
    dbMocks.findArticleUrlConflict.mockResolvedValue({ id: 92, path: "/insights/another-path/", slug: validArticle.slug });
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    await expect(caller.article.update({ id: 44, ...validArticle })).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("slug is already used"),
    });
    expect(dbMocks.findArticleUrlConflict).toHaveBeenCalledWith({
      path: validArticle.path,
      slug: validArticle.slug,
      excludeId: 44,
    });
    expect(dbMocks.updateArticle).not.toHaveBeenCalled();
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

  it("lets a content manager generate a durable AI cover without changing the article automatically", async () => {
    imageGenerationMocks.generateImage.mockResolvedValue({
      key: "generated/nyc-lobby.png",
      url: "/manus-storage/nyc-lobby.png",
    });
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    const result = await caller.article.generateCover({
      title: "How to Keep a Lobby Ready for Residents",
      excerpt: "A practical maintenance plan for high-traffic New York entrances.",
      prompt: "A realistic building porter maintaining a bright Manhattan apartment lobby",
    });

    expect(result).toEqual({
      key: "generated/nyc-lobby.png",
      url: "/manus-storage/nyc-lobby.png",
    });
    expect(imageGenerationMocks.generateImage).toHaveBeenCalledWith({
      prompt: expect.stringContaining("horizontal 3:2 website cover"),
    });
    expect(dbMocks.updateArticle).not.toHaveBeenCalled();
  });

  it("denies non-CMS users access to AI cover generation", async () => {
    const caller = appRouter.createCaller(context(user({ openId: "not-an-owner", role: "user" })));

    await expect(caller.article.generateCover({
      prompt: "A realistic New York apartment lobby prepared for the morning rush",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(imageGenerationMocks.generateImage).not.toHaveBeenCalled();
  });

  it("lets a content manager generate editable supporting text from the Article Body without saving it", async () => {
    const body = "A practical New York property cleaning article body with enough detailed guidance for the editor. ".repeat(4);
    seoGenerationMocks.generateArticleSeoFields.mockResolvedValue({
      seoTitle: "Practical Property Cleaning Planning",
      metaDescription: "Plan routine property cleaning around building use, service windows, and a clearly documented scope.",
      excerpt: "A useful framework for planning routine property cleaning around building needs and a clear service scope.",
    });
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    await expect(caller.article.generateSeoFields({ body })).resolves.toEqual({
      seoTitle: "Practical Property Cleaning Planning",
      metaDescription: "Plan routine property cleaning around building use, service windows, and a clearly documented scope.",
      excerpt: "A useful framework for planning routine property cleaning around building needs and a clear service scope.",
    });
    expect(seoGenerationMocks.generateArticleSeoFields).toHaveBeenCalledWith(body.trim());
    expect(dbMocks.updateArticle).not.toHaveBeenCalled();
    expect(dbMocks.createArticle).not.toHaveBeenCalled();
  });

  it("requires a sufficiently developed Article Body before generation", async () => {
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    await expect(caller.article.generateSeoFields({ body: "Too short." })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("at least 200 characters"),
    });
    expect(seoGenerationMocks.generateArticleSeoFields).not.toHaveBeenCalled();
  });

  it("denies non-CMS users access to Article Body text generation", async () => {
    const caller = appRouter.createCaller(context(user({ openId: "not-an-owner", role: "user" })));

    await expect(caller.article.generateSeoFields({
      body: "A sufficiently long article body that an ordinary user must not be allowed to submit for CMS generation. ".repeat(4),
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(seoGenerationMocks.generateArticleSeoFields).not.toHaveBeenCalled();
  });
});
