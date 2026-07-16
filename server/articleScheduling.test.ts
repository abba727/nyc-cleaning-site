import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getArticlePublicationState, isArticlePublic } from "../shared/articleScheduling";

const now = new Date("2026-07-16T18:00:00.000Z");

describe("Insight publication scheduling", () => {
  it("keeps drafts private regardless of their selected date", () => {
    const article = { status: "draft" as const, publishedAt: new Date("2026-07-15T18:00:00.000Z") };
    expect(getArticlePublicationState(article, now)).toBe("draft");
    expect(isArticlePublic(article, now)).toBe(false);
  });

  it("labels future published articles as scheduled and keeps them private", () => {
    const article = { status: "published" as const, publishedAt: new Date("2026-07-17T18:00:00.000Z") };
    expect(getArticlePublicationState(article, now)).toBe("scheduled");
    expect(isArticlePublic(article, now)).toBe(false);
  });

  it("makes an article public at its selected publication time", () => {
    const article = { status: "published" as const, publishedAt: new Date("2026-07-16T18:00:00.000Z") };
    expect(getArticlePublicationState(article, now)).toBe("published");
    expect(isArticlePublic(article, now)).toBe(true);
  });

  it("preserves the visibility of legacy published rows without a publication date", () => {
    const article = { status: "published" as const, publishedAt: null };
    expect(getArticlePublicationState(article, now)).toBe("published");
    expect(isArticlePublic(article, now)).toBe(true);
  });

  it("enforces the selected publication time in both public database queries", () => {
    const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    expect(dbSource.match(/lte\(articles\.publishedAt, now\)/g)).toHaveLength(2);
    expect(dbSource.match(/isNull\(articles\.publishedAt\)/g)).toHaveLength(2);
  });
});
