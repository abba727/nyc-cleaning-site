import { describe, expect, it } from "vitest";
import rawArticleImages from "../client/src/content/article-images.json";
import { legacyArticles, normalizePath } from "../client/src/content/site";

describe("article cover manifest", () => {
  it("assigns every preserved article a distinct production image and descriptive alt text", () => {
    const manifest = rawArticleImages as Record<string, { src: string; alt: string }>;
    const articlePaths = legacyArticles.map(article => normalizePath(article.path));
    const entries = articlePaths.map(path => manifest[path]);

    expect(articlePaths).toHaveLength(95);
    expect(entries.every(Boolean)).toBe(true);
    expect(new Set(entries.map(entry => entry.src)).size).toBe(articlePaths.length);
    expect(entries.every(entry => entry.src.startsWith("/manus-storage/") && entry.alt.trim().length >= 12)).toBe(true);
  });
});
