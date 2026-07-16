import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ARTICLE_GENERATED_WORDS,
  ARTICLE_TOPIC_MIN_LENGTH,
} from "@shared/articleSeo";

const llmMocks = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("./_core/llm", () => llmMocks);

import { countArticleWords, generateArticleFromTopic } from "./articleGeneration";

function validGeneratedArticle() {
  const details = Array.from({ length: 175 }, (_, index) => `detail${index + 1}`).join(" ");
  return [
    "A practical cleaning plan starts with a clear understanding of how the property is used each day.",
    "## Identify the busiest areas",
    details,
    "## Build a repeatable routine",
    "Review the plan regularly and adjust the scope when traffic, weather, or building needs change.",
  ].join("\n\n");
}

function oversizedGeneratedArticle() {
  const intro = Array.from({ length: 55 }, (_, index) => `intro${index + 1}`).join(" ");
  const requirements = Array.from({ length: 110 }, (_, index) => `req${index + 1}`).join(" ");
  const tradeoffs = Array.from({ length: 105 }, (_, index) => `pro${index + 1}`).join(" ");
  return [
    intro,
    "## Understand the inspection requirement",
    requirements,
    "## Weigh practical benefits and limitations",
    tradeoffs,
  ].join("\n\n");
}

describe("topic-to-article generation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests strict structured output and returns an approximately 200-word article with headings", async () => {
    const article = validGeneratedArticle();
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ article }) } }],
    });

    const result = await generateArticleFromTopic("How NYC property managers can plan lobby cleaning");

    expect(result.article).toBe(article);
    expect(result.wordCount).toBeGreaterThanOrEqual(ARTICLE_GENERATED_WORDS.min);
    expect(result.wordCount).toBeLessThanOrEqual(ARTICLE_GENERATED_WORDS.max);
    expect(result.article.match(/^##\s+/gm)).toHaveLength(2);
    expect(llmMocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5-mini",
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", content: expect.stringContaining("How NYC property managers") }),
      ]),
      response_format: expect.objectContaining({
        type: "json_schema",
        json_schema: expect.objectContaining({ name: "generated_insight_article", strict: true }),
      }),
    }));
  });

  it("retries once when the first draft misses the required length or structure", async () => {
    const article = validGeneratedArticle();
    llmMocks.invokeLLM
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ article: "A draft that is too short." }) } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ article }) } }] });

    await expect(generateArticleFromTopic("A cleaning schedule for high-traffic common areas")).resolves.toMatchObject({ article });
    expect(llmMocks.invokeLLM).toHaveBeenCalledTimes(2);
    expect(llmMocks.invokeLLM.mock.calls[1][0].messages[1].content).toContain("Revision requirement");
  });

  it("recovers when both model attempts exceed the maximum instead of rejecting the article", async () => {
    const oversized = oversizedGeneratedArticle();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ article: oversized }) } }],
    });

    const result = await generateArticleFromTopic(
      "NYC parapet inspection requirements, why inspections are needed, and their practical pros and cons",
    );

    expect(countArticleWords(oversized)).toBeGreaterThan(ARTICLE_GENERATED_WORDS.max);
    expect(result.wordCount).toBeGreaterThanOrEqual(ARTICLE_GENERATED_WORDS.min);
    expect(result.wordCount).toBeLessThanOrEqual(ARTICLE_GENERATED_WORDS.max);
    expect(result.article.match(/^##\s+/gm)).toHaveLength(2);
    expect(llmMocks.invokeLLM).toHaveBeenCalledTimes(2);
    expect(llmMocks.invokeLLM.mock.calls[1][0].messages[1].content).toContain("Draft to revise");
    expect(warnSpy).toHaveBeenCalledWith("[Article] Normalized oversized AI draft", expect.objectContaining({
      originalWordCount: expect.any(Number),
      finalWordCount: result.wordCount,
      headingCount: 2,
    }));

    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("rejects a topic that is too short before calling the model", async () => {
    await expect(generateArticleFromTopic("Lobby")).rejects.toThrow(`at least ${ARTICLE_TOPIC_MIN_LENGTH} characters`);
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("counts Markdown headings as words without counting heading markers", () => {
    expect(countArticleWords("## Better Routines\n\nClean shared spaces consistently.")).toBe(6);
  });
});
