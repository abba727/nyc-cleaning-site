import { beforeEach, describe, expect, it, vi } from "vitest";
import { ARTICLE_BODY_MIN_GENERATION_LENGTH, ARTICLE_TITLE_SUGGESTION_MAX_LENGTH } from "@shared/articleSeo";

const llmMocks = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("./_core/llm", () => llmMocks);

import { generateArticleTitleSuggestion } from "./articleTitleGeneration";

const articleBody = [
  "New York apartment lobbies need cleaning routines that account for resident traffic, deliveries, wet weather, entry glass, floor finishes, and elevator use.",
  "A practical plan assigns daily floor care, touchpoint cleaning, waste removal, and periodic detailing to defined service windows.",
  "Property teams should review the routine when building use or seasonal conditions change.",
].join(" ");

describe("article title suggestion generation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests one strict structured title derived only from the Article Body", async () => {
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ title: "How to Plan Reliable NYC Lobby Cleaning" }) } }],
    });

    await expect(generateArticleTitleSuggestion(articleBody)).resolves.toEqual({
      title: "How to Plan Reliable NYC Lobby Cleaning",
    });
    expect(llmMocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5-mini",
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", content: expect.stringContaining(articleBody) }),
      ]),
      response_format: expect.objectContaining({
        type: "json_schema",
        json_schema: expect.objectContaining({
          name: "article_title_suggestion",
          strict: true,
          schema: expect.objectContaining({ additionalProperties: false }),
        }),
      }),
    }));
  });

  it("rejects a short Article Body before calling the model", async () => {
    await expect(generateArticleTitleSuggestion("Short body.")).rejects.toThrow(
      `at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters`,
    );
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("normalizes quotation marks and clips an oversized title at a word boundary", async () => {
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ title: `“Practical Lobby Cleaning ${"Planning ".repeat(18)}”` }) } }],
    });

    const result = await generateArticleTitleSuggestion(articleBody);
    expect(result.title.length).toBeLessThanOrEqual(ARTICLE_TITLE_SUGGESTION_MAX_LENGTH);
    expect(result.title).not.toMatch(/^["“”']|["“”']$/);
    expect(result.title).not.toMatch(/\s{2,}/);
  });
});
