import { beforeEach, describe, expect, it, vi } from "vitest";
import { ARTICLE_BODY_MIN_GENERATION_LENGTH, ARTICLE_IMAGE_DESCRIPTION_MAX_LENGTH } from "@shared/articleSeo";

const llmMocks = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("./_core/llm", () => llmMocks);

import { fallbackArticleCoverDescription, generateArticleCoverDescription } from "./articleImageDescription";

const input = {
  title: "How to Plan Reliable NYC Lobby Cleaning",
  body: "A New York apartment lobby porter coordinates floor care, entry-glass cleaning, elevator detailing, touchpoint cleaning, deliveries, resident traffic, and rainy-day safety. ".repeat(2),
  direction: "Wide eye-level scene in soft morning light",
};
const imageUrl = "https://storage.example.com/generated/nyc-lobby.png";

describe("article cover image descriptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests concise structured alt text from the same article-derived context", async () => {
    llmMocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ description: "A porter cleans the stone floor of a busy New York apartment lobby" }) } }],
    });

    await expect(generateArticleCoverDescription(input, imageUrl)).resolves.toBe(
      "A porter cleans the stone floor of a busy New York apartment lobby",
    );
    expect(llmMocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({
      model: "gemini-3-flash-preview",
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.arrayContaining([
            expect.objectContaining({ type: "text", text: expect.stringContaining(input.body.trim()) }),
            { type: "image_url", image_url: { url: imageUrl, detail: "auto" } },
          ]),
        }),
      ]),
      response_format: expect.objectContaining({
        type: "json_schema",
        json_schema: expect.objectContaining({ name: "article_cover_description", strict: true }),
      }),
    }));
  });

  it("provides a bounded article-derived fallback when description generation is unavailable", () => {
    const description = fallbackArticleCoverDescription(input);
    expect(description).toContain(input.title);
    expect(description.length).toBeLessThanOrEqual(ARTICLE_IMAGE_DESCRIPTION_MAX_LENGTH);
  });

  it("rejects a short Article Body before calling the model", async () => {
    await expect(generateArticleCoverDescription({ body: "Short body." }, imageUrl)).rejects.toThrow(
      `at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters`,
    );
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("rejects a non-URL image reference before calling the vision model", async () => {
    await expect(generateArticleCoverDescription(input, "/manus-storage/generated/cover.png")).rejects.toThrow();
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
  });
});
