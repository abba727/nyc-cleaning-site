import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ getPublishedArticleByPath: vi.fn(), getSiteSettings: vi.fn(), listPublishedArticles: vi.fn() }));
vi.mock("./db", () => dbMocks);

import { render } from "../client/src/entry-server";

describe("CMS Insight SSR hydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.listPublishedArticles.mockResolvedValue([]);
    dbMocks.getSiteSettings.mockResolvedValue({ googleAnalyticsMeasurementId: null, googleTagManagerContainerId: null });
  });

  it("server-renders the published article body and serializes matching initial client state", async () => {
    dbMocks.getPublishedArticleByPath.mockResolvedValue({
      id: 21,
      path: "/cms-ssr-seo-guide/",
      title: "CMS SSR SEO Guide",
      excerpt: "A concise guide to crawler-visible CMS Insight rendering.",
      description: "A concise guide to crawler-visible CMS Insight rendering.",
      body: [
        { type: "h2", text: "Visible guidance" },
        { type: "p", text: "Published CMS Insight content is visible in the first server response." },
      ],
      blocks: [],
      coverImageUrl: "/manus-storage/generated/cms-cover.webp",
      coverImageAlt: "Cleaner maintaining a commercial lobby",
      seoTitle: "CMS SSR SEO Guide | NYC Cleaning",
      metaDescription: "Learn how NYC Cleaning publishes crawler-visible Insight content with stable server rendering.",
      publishedAt: new Date("2026-07-16T18:00:00.000Z"),
      updatedAt: new Date("2026-07-17T01:00:00.000Z"),
    });

    const result = await render("/cms-ssr-seo-guide/");
    expect(result.status).toBe(200);
    expect(result.html).toContain("Published CMS Insight content is visible in the first server response.");
    expect(result.html).not.toContain("Loading article");
    expect(result.head).toContain("window.__INITIAL_ARTICLE__=");
    expect(result.head).toContain('"@type":"Article"');
    expect(result.html).toContain('/media/generated/cms-cover.webp');
    expect(result.head).toContain('/media/generated/cms-cover.webp');
    expect(result.html).not.toContain('/manus-storage/');
    expect(result.head).toContain('"dateModified":"2026-07-17T01:00:00.000Z"');
  });

  it("defers homepage insights until after the initial SSR response", async () => {
    dbMocks.listPublishedArticles.mockResolvedValue([
      {
        path: "/latest-insight-one/",
        title: "Latest Insight One",
        excerpt: "First latest insight.",
        description: "First latest insight.",
        body: [],
        blocks: [],
        coverImageUrl: "/media/latest-one.webp",
        coverImageAlt: "Property care guidance",
        publishedAt: new Date("2026-07-21T12:00:00.000Z"),
      },
      {
        path: "/latest-insight-two/",
        title: "Latest Insight Two",
        excerpt: "Second latest insight.",
        description: "Second latest insight.",
        body: [],
        blocks: [],
        coverImageUrl: "/media/latest-two.webp",
        coverImageAlt: "Commercial cleaning guidance",
        publishedAt: new Date("2026-07-20T12:00:00.000Z"),
      },
      {
        path: "/latest-insight-three/",
        title: "Latest Insight Three",
        excerpt: "Third latest insight.",
        description: "Third latest insight.",
        body: [],
        blocks: [],
        coverImageUrl: "/media/latest-three.webp",
        coverImageAlt: "Building maintenance guidance",
        publishedAt: new Date("2026-07-19T12:00:00.000Z"),
      },
      {
        path: "/older-insight/",
        title: "Older Insight",
        excerpt: "This should not appear in the latest three.",
        description: "This should not appear in the latest three.",
        body: [],
        blocks: [],
        coverImageUrl: "/media/older.webp",
        coverImageAlt: "Older guidance",
        publishedAt: new Date("2026-07-18T12:00:00.000Z"),
      },
    ]);

    const result = await render("/");
    expect(result.status).toBe(200);
    // Insight cards are loaded by the idle client boundary through the compact
    // /api/homepage-insights endpoint, rather than delaying the HTML response.
    expect(result.html).not.toContain("The latest guidance from our team.");
    expect(result.html).not.toContain("Latest Insight One");
    expect(result.html).not.toContain("Latest Insight Two");
    expect(result.html).not.toContain("Latest Insight Three");
    expect(result.head).not.toContain("window.__INITIAL_INSIGHTS__=");
    expect(dbMocks.listPublishedArticles).not.toHaveBeenCalled();
  });

  it("escapes serialized article content so it cannot terminate the state script", async () => {
    dbMocks.getPublishedArticleByPath.mockResolvedValue({
      id: 22,
      path: "/safe-serialized-insight/",
      title: "Safe serialized Insight",
      excerpt: "Safe serialized content for hydration validation.",
      description: "Safe serialized content for hydration validation.",
      body: [
        { type: "h2", text: "Safety" },
        { type: "p", text: "Avoid </script><script>alert('unsafe')</script> in state." },
      ],
      blocks: [],
      coverImageUrl: "/media/cms-cover.webp",
      coverImageAlt: "Commercial cleaner preparing equipment",
      seoTitle: null,
      metaDescription: null,
      publishedAt: new Date("2026-07-16T18:00:00.000Z"),
      updatedAt: new Date("2026-07-16T18:00:00.000Z"),
    });

    const result = await render("/safe-serialized-insight/");
    const stateScript = result.head.match(/<script>window\.__INITIAL_ARTICLE__=(.*?)<\/script>/)?.[1] || "";
    expect(stateScript).toContain("\\u003c/script>");
    expect(stateScript).not.toContain("</script>");
  });
});

describe("deferred CMS tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getPublishedArticleByPath.mockResolvedValue(null);
    dbMocks.listPublishedArticles.mockResolvedValue([]);
  });

  it("does not block the public SSR document on optional tracking configuration", async () => {
    dbMocks.getSiteSettings.mockResolvedValue({ googleAnalyticsMeasurementId: "G-TEST12345", googleTagManagerContainerId: "GTM-TEST123" });

    const result = await render("/");

    expect(result.head).not.toContain("googletagmanager.com");
    expect(result.head).not.toContain("G-TEST12345");
    expect(result.body).toBe("");
    expect(dbMocks.getSiteSettings).not.toHaveBeenCalled();
  });
});
