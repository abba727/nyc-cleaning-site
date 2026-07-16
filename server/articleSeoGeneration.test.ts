import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ARTICLE_BODY_MIN_GENERATION_LENGTH,
  ARTICLE_SEO_LIMITS,
} from "@shared/articleSeo";

const llmMocks = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("./_core/llm", () => llmMocks);

import { generateArticleSeoFields } from "./articleSeoGeneration";

const articleBody = [
  "New York building lobbies need a documented cleaning plan that reflects traffic patterns, weather, resident schedules, and the surfaces in the space.",
  "A practical routine assigns daily floor care, touchpoint cleaning, glass cleaning, waste removal, and periodic deep cleaning to clear service windows.",
  "Property teams should review the scope regularly and adjust it when seasonal conditions or building use changes.",
].join(" ");

describe("article SEO field generation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests strict structured output derived from the Article Body", async () => {
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            seoTitle: "A Practical NYC Lobby Cleaning Plan",
            metaDescription: "Build a practical lobby cleaning plan around traffic, weather, surfaces, daily tasks, and scheduled deep cleaning.",
            excerpt: "A practical lobby cleaning routine aligns daily floor, glass, touchpoint, and waste service with each building’s traffic and seasonal needs.",
          }),
        },
      }],
    });

    await expect(generateArticleSeoFields(articleBody)).resolves.toEqual({
      seoTitle: "A Practical NYC Lobby Cleaning Plan",
      metaDescription: "Build a practical lobby cleaning plan around traffic, weather, surfaces, daily tasks, and scheduled deep cleaning.",
      excerpt: "A practical lobby cleaning routine aligns daily floor, glass, touchpoint, and waste service with each building’s traffic and seasonal needs.",
    });

    expect(llmMocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5-mini",
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", content: expect.stringContaining(articleBody) }),
      ]),
      response_format: expect.objectContaining({
        type: "json_schema",
        json_schema: expect.objectContaining({
          name: "article_seo_fields",
          strict: true,
          schema: expect.objectContaining({ additionalProperties: false }),
        }),
      }),
    }));
  });

  it("rejects an Article Body that is too short before calling the model", async () => {
    await expect(generateArticleSeoFields("Short draft.")).rejects.toThrow(
      `at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters`,
    );
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("normalizes whitespace and enforces product limits on every generated field", async () => {
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            seoTitle: `Practical Lobby Cleaning ${"Plan ".repeat(20)}`,
            metaDescription: `A practical summary ${"for New York property teams ".repeat(12)}`,
            excerpt: `A useful article excerpt ${"about planned lobby cleaning and maintenance routines ".repeat(15)}`,
          }),
        },
      }],
    });

    const result = await generateArticleSeoFields(articleBody);

    expect(result.seoTitle.length).toBeLessThanOrEqual(ARTICLE_SEO_LIMITS.seoTitle);
    expect(result.metaDescription.length).toBeLessThanOrEqual(ARTICLE_SEO_LIMITS.metaDescription);
    expect(result.excerpt.length).toBeLessThanOrEqual(ARTICLE_SEO_LIMITS.excerpt);
    expect(Object.values(result).every(value => !/\s{2,}/.test(value))).toBe(true);
  });
});
