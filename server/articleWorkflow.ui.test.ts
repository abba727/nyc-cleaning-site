import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/ArticleAdmin.tsx"), "utf8");

describe("Insight editor workflow", () => {
  it("offers date-based scheduling with explicit Draft, Scheduled, and Published states", () => {
    expect(source).toContain('type="datetime-local"');
    expect(source).toContain('value="scheduled">Scheduled');
    expect(source).toContain("This Insight will become public automatically at this time.");
  });

  it("requires explicit approval before a generated image becomes the cover", () => {
    expect(source).toContain("Generate image with AI");
    expect(source).toContain("Generated preview");
    expect(source).toContain("Use this image");
    expect(source).toContain('updateField("coverImageUrl", generatedImage.url)');
  });

  it("uses a substantially larger multi-line excerpt editor", () => {
    expect(source).toContain('id="article-excerpt"');
    expect(source).toContain('className="admin-excerpt-input" rows={8}');
  });

  it("generates new Insight URLs from the title while preserving intentional overrides", () => {
    expect(source).toContain("normalizeArticleSlug(title)");
    expect(source).toContain("canonicalInsightPath(slug)");
    expect(source).toContain('setUrlOverrides(current => ({ ...current, slug: true }))');
    expect(source).toContain('setUrlOverrides(current => ({ ...current, path: true }))');
    expect(source).toContain('setUrlOverrides({ slug: true, path: true })');
    expect(source).toContain("Generated automatically as /insights/{slug}/.");
  });
});
