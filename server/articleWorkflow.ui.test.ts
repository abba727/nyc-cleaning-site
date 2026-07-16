import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/ArticleAdmin.tsx"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

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

  it("places the Article Body before the Excerpt and all generated search fields", () => {
    const bodyIndex = source.indexOf('id="article-body"');
    const excerptIndex = source.indexOf('id="article-excerpt"');
    const seoTitleIndex = source.indexOf('id="article-seo-title"');
    const metaDescriptionIndex = source.indexOf('id="article-meta"');

    expect(bodyIndex).toBeGreaterThan(-1);
    expect(bodyIndex).toBeLessThan(excerptIndex);
    expect(excerptIndex).toBeLessThan(seoTitleIndex);
    expect(seoTitleIndex).toBeLessThan(metaDescriptionIndex);
  });

  it("offers explicit per-field Generate links with independent loading and error states", () => {
    expect(source).toContain('generateControl("all"');
    expect(source).toContain('generateControl("excerpt"');
    expect(source).toContain('generateControl("seoTitle"');
    expect(source).toContain('generateControl("metaDescription"');
    expect(source).toContain('onClick={() => void generateFromBody(target)}');
    expect(source).toContain('generatingField === target ? "Generating…"');
    expect(source).toContain('generationErrors[target]');
  });

  it("only applies generated text after a click and keeps every result editable", () => {
    const generatorIndex = source.indexOf("const generateFromBody = async");
    const clickIndex = source.indexOf('onClick={() => void generateFromBody(target)}');

    expect(generatorIndex).toBeGreaterThan(-1);
    expect(clickIndex).toBeGreaterThan(generatorIndex);
    expect(source).toContain('target === "all" || target === "excerpt" ? { excerpt: result.excerpt }');
    expect(source).toContain('target === "all" || target === "seoTitle" ? { seoTitle: result.seoTitle }');
    expect(source).toContain('target === "all" || target === "metaDescription" ? { metaDescription: result.metaDescription }');
    expect(source).toContain('onChange={event => updateField("excerpt", event.target.value)}');
    expect(source).toContain('onChange={event => updateField("seoTitle", event.target.value)}');
    expect(source).toContain('onChange={event => updateField("metaDescription", event.target.value)}');
  });

  it("shows short-body guidance and generated character limits", () => {
    expect(source).toContain("ARTICLE_BODY_MIN_GENERATION_LENGTH");
    expect(source).toContain("Write at least");
    expect(source).toContain("ARTICLE_SEO_LIMITS.excerpt");
    expect(source).toContain("ARTICLE_SEO_LIMITS.seoTitle");
    expect(source).toContain("ARTICLE_SEO_LIMITS.metaDescription");
  });

  it("keeps Generate controls below the field and right-aligned on narrow screens", () => {
    expect(styles).toContain(".admin-field-footer { display: flex;");
    expect(styles).toContain(".admin-generate-link { display: inline-flex;");
    expect(styles).toContain(".admin-field-footer { align-items: flex-end; flex-direction: column;");
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
