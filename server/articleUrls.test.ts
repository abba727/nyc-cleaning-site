import { describe, expect, it } from "vitest";
import { canonicalInsightPath, INSIGHT_CANONICAL_ROOT, normalizeArticleSlug } from "../shared/articleUrls";

describe("Insight URL generation", () => {
  it("normalizes punctuation, accents, ampersands, and repeated separators", () => {
    expect(normalizeArticleSlug("  Café & Office Cleaning: NYC's 2026 Guide!  ")).toBe("cafe-and-office-cleaning-nyc-s-2026-guide");
  });

  it("builds the canonical Insight path from the normalized slug", () => {
    expect(canonicalInsightPath("A Better Lobby Plan")).toBe("/a-better-lobby-plan/");
    expect(INSIGHT_CANONICAL_ROOT).toBe("/");
    expect(canonicalInsightPath("")).toBe(INSIGHT_CANONICAL_ROOT);
  });

  it("limits generated slugs to the database-safe editorial length", () => {
    expect(normalizeArticleSlug("a".repeat(300))).toHaveLength(180);
  });
});
