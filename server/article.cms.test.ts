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

const storageMocks = vi.hoisted(() => ({ storageGetSignedUrl: vi.fn(), storagePut: vi.fn() }));
const imageGenerationMocks = vi.hoisted(() => ({ generateImage: vi.fn() }));
const imageDescriptionMocks = vi.hoisted(() => ({
  fallbackArticleCoverDescription: vi.fn(),
  generateArticleCoverDescription: vi.fn(),
}));
const seoGenerationMocks = vi.hoisted(() => ({ generateArticleSeoFields: vi.fn() }));
const articleGenerationMocks = vi.hoisted(() => ({ generateArticleFromTopic: vi.fn() }));
const titleGenerationMocks = vi.hoisted(() => ({ generateArticleTitleSuggestion: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./storage", () => storageMocks);
vi.mock("./_core/imageGeneration", () => imageGenerationMocks);
vi.mock("./articleImageDescription", () => imageDescriptionMocks);
vi.mock("./articleSeoGeneration", () => seoGenerationMocks);
vi.mock("./articleGeneration", () => articleGenerationMocks);
vi.mock("./articleTitleGeneration", () => titleGenerationMocks);
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
    imageDescriptionMocks.fallbackArticleCoverDescription.mockReturnValue("Editorial cover illustrating the article topic");
    storageMocks.storageGetSignedUrl.mockResolvedValue("https://storage.example.com/generated/article-cover.png");
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
    const body = "A New York apartment lobby porter follows resident traffic, delivery windows, rainy-day floor conditions, entry-glass care, touchpoint cleaning, waste removal, and elevator detailing. ".repeat(2);
    imageGenerationMocks.generateImage.mockResolvedValue({
      key: "generated/nyc-lobby.png",
      url: "/manus-storage/nyc-lobby.png",
    });
    imageDescriptionMocks.generateArticleCoverDescription.mockResolvedValue(
      "A porter cleans the stone floor of a busy New York apartment lobby",
    );
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    const result = await caller.article.generateCover({
      body,
      title: "How to Keep a Lobby Ready for Residents",
      excerpt: "A practical maintenance plan for high-traffic New York entrances.",
      direction: "A wide eye-level view in soft morning light",
    });

    expect(result).toEqual({
      key: "generated/nyc-lobby.png",
      url: "/manus-storage/nyc-lobby.png",
      description: "A porter cleans the stone floor of a busy New York apartment lobby",
    });
    expect(imageGenerationMocks.generateImage).toHaveBeenCalledWith({
      prompt: expect.stringMatching(/Article Body:[\s\S]*New York apartment lobby porter[\s\S]*Optional visual direction from the editor: A wide eye-level view/),
    });
    expect(storageMocks.storageGetSignedUrl).toHaveBeenCalledWith("generated/nyc-lobby.png");
    expect(imageDescriptionMocks.generateArticleCoverDescription).toHaveBeenCalledWith(
      expect.objectContaining({ body: body.trim() }),
      "https://storage.example.com/generated/article-cover.png",
    );
    expect(dbMocks.updateArticle).not.toHaveBeenCalled();
  });

  it("returns an article-derived description fallback without discarding a successful generated image", async () => {
    const body = "A detailed Article Body about New York lobby floors, entry glass, elevator detailing, porter service windows, deliveries, and resident traffic. ".repeat(2);
    imageGenerationMocks.generateImage.mockResolvedValue({ key: "generated/fallback.png", url: "/manus-storage/fallback.png" });
    imageDescriptionMocks.fallbackArticleCoverDescription.mockReturnValue("Editorial cover illustrating a New York lobby cleaning plan");
    imageDescriptionMocks.generateArticleCoverDescription.mockRejectedValue(new Error("Temporary model error"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    try {
      await expect(caller.article.generateCover({ body })).resolves.toEqual({
        key: "generated/fallback.png",
        url: "/manus-storage/fallback.png",
        description: "Editorial cover illustrating a New York lobby cleaning plan",
      });
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("requires the Article Body under the new cover contract and rejects the retired prompt-only shape", async () => {
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    await expect(caller.article.generateCover({ body: "Too short." })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("at least 200 characters"),
    });
    await expect(caller.article.generateCover({
      prompt: "A realistic New York apartment lobby prepared for the morning rush",
    } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(imageGenerationMocks.generateImage).not.toHaveBeenCalled();
  });

  it("returns a safe recoverable error when the image service responds with HTML", async () => {
    const body = "A detailed Article Body about high-traffic lobby care, porter schedules, floor safety, entry glass, elevators, waste collection, and resident service standards in a New York apartment property. ".repeat(2);
    imageGenerationMocks.generateImage.mockRejectedValue(new Error("Unexpected token '<', \"<html>504 Gateway Time-out</html>\" is not valid JSON"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    try {
      await expect(caller.article.generateCover({ body })).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "The image service could not complete this request. Please try Generate image again in a moment.",
      });
      expect(dbMocks.updateArticle).not.toHaveBeenCalled();
      expect(dbMocks.createArticle).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("denies non-CMS users access to AI cover generation", async () => {
    const caller = appRouter.createCaller(context(user({ openId: "not-an-owner", role: "user" })));

    await expect(caller.article.generateCover({
      body: "A sufficiently developed Article Body about a New York apartment lobby, porter schedules, entrance floors, glass, elevators, and resident-facing maintenance standards. ".repeat(2),
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(imageGenerationMocks.generateImage).not.toHaveBeenCalled();
  });

  it("lets a content manager suggest an editable title from the Article Body without saving", async () => {
    const body = "A practical New York property cleaning article body with enough detailed guidance for the editor. ".repeat(4);
    titleGenerationMocks.generateArticleTitleSuggestion.mockResolvedValue({ title: "How to Plan Reliable NYC Property Cleaning" });
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    await expect(caller.article.suggestTitle({ body })).resolves.toEqual({
      title: "How to Plan Reliable NYC Property Cleaning",
    });
    expect(titleGenerationMocks.generateArticleTitleSuggestion).toHaveBeenCalledWith(body.trim());
    expect(dbMocks.updateArticle).not.toHaveBeenCalled();
    expect(dbMocks.createArticle).not.toHaveBeenCalled();
  });

  it("requires a developed Article Body and CMS authorization before suggesting a title", async () => {
    const manager = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));
    await expect(manager.article.suggestTitle({ body: "Too short." })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("at least 200 characters"),
    });

    const ordinaryUser = appRouter.createCaller(context(user({ openId: "not-an-owner", role: "user" })));
    await expect(ordinaryUser.article.suggestTitle({
      body: "A sufficiently long Article Body that an ordinary user must not submit for title generation. ".repeat(4),
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(titleGenerationMocks.generateArticleTitleSuggestion).not.toHaveBeenCalled();
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

  it("lets a content manager generate an editable article from an Article Body topic without saving it", async () => {
    articleGenerationMocks.generateArticleFromTopic.mockResolvedValue({
      article: "A practical introduction.\n\n## Plan the work\n\nUseful details.\n\n## Review the routine\n\nA concise conclusion.",
      wordCount: 198,
    });
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    await expect(caller.article.generateArticle({
      topic: "How to plan reliable common-area cleaning in an NYC building",
    })).resolves.toMatchObject({ wordCount: 198 });
    expect(articleGenerationMocks.generateArticleFromTopic).toHaveBeenCalledWith(
      "How to plan reliable common-area cleaning in an NYC building",
    );
    expect(dbMocks.updateArticle).not.toHaveBeenCalled();
    expect(dbMocks.createArticle).not.toHaveBeenCalled();
  });

  it("returns a safe, recoverable editor error when the article service cannot produce a usable draft", async () => {
    articleGenerationMocks.generateArticleFromTopic.mockRejectedValue(new Error("Upstream response was unusable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const caller = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));

    await expect(caller.article.generateArticle({
      topic: "NYC parapet inspection requirements and practical advantages and limitations",
    })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("your topic remains in the editor"),
    });
    expect(dbMocks.updateArticle).not.toHaveBeenCalled();
    expect(dbMocks.createArticle).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("validates topic length and denies non-CMS users access to article generation", async () => {
    const editor = appRouter.createCaller(context(user({ openId: ENV.ownerOpenId, role: "content_manager" })));
    await expect(editor.article.generateArticle({ topic: "Short" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("at least 10 characters"),
    });

    const ordinaryUser = appRouter.createCaller(context(user({ openId: "not-an-owner", role: "user" })));
    await expect(ordinaryUser.article.generateArticle({
      topic: "How to plan reliable common-area cleaning in an NYC building",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(articleGenerationMocks.generateArticleFromTopic).not.toHaveBeenCalled();
  });
});
