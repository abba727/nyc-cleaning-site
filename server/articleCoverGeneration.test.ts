import { describe, expect, it, beforeEach, vi } from "vitest";
import { ARTICLE_BODY_MIN_GENERATION_LENGTH } from "@shared/articleSeo";

const imageGenerationMocks = vi.hoisted(() => ({ generateImage: vi.fn() }));

vi.mock("./_core/imageGeneration", () => imageGenerationMocks);

import { buildArticleCoverPrompt, generateArticleCover } from "./articleCoverGeneration";

const articleBody = [
  "New York apartment lobbies need a porter routine that follows resident traffic, delivery windows, rainy-weather floor conditions, and the materials used throughout the entrance.",
  "A reliable plan includes entry-glass cleaning, touchpoint disinfection, mat care, waste removal, elevator detailing, and prompt attention to tracked-in moisture.",
  "Property teams should document the scope and review results with the service provider as building use changes.",
].join(" ");

describe("article cover generation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds a website-cover prompt whose primary subject comes from the Article Body", () => {
    const prompt = buildArticleCoverPrompt({
      body: articleBody,
      title: "A Practical Lobby Porter Routine",
      excerpt: "Plan daily porter work around building traffic and entrance conditions.",
      direction: "Use a wide eye-level view in soft morning light",
    });

    expect(prompt).toContain("Derive the image subject primarily from the Article Body");
    expect(prompt).toContain(articleBody);
    expect(prompt).toContain("Article title: A Practical Lobby Porter Routine.");
    expect(prompt).toContain("Article excerpt: Plan daily porter work around building traffic and entrance conditions.");
    expect(prompt).toContain("Optional visual direction from the editor: Use a wide eye-level view in soft morning light.");
    expect(prompt.indexOf("Article Body:")).toBeLessThan(prompt.indexOf("Optional visual direction"));
    expect(prompt).toContain("horizontal 3:2 website cover");
    expect(prompt).toContain("Do not include text, logos, watermarks");
  });

  it("omits optional visual direction when the editor leaves it blank", () => {
    const prompt = buildArticleCoverPrompt({ body: articleBody, direction: "   " });

    expect(prompt).toContain(articleBody);
    expect(prompt).not.toContain("Optional visual direction from the editor");
  });

  it("limits Article Body context to 12,000 characters without dropping the cover constraints", () => {
    const prompt = buildArticleCoverPrompt({
      body: `${"A".repeat(12_000)}BODY_CONTEXT_AFTER_LIMIT`,
    });

    expect(prompt).toContain("A".repeat(12_000));
    expect(prompt).not.toContain("BODY_CONTEXT_AFTER_LIMIT");
    expect(prompt).toContain("horizontal 3:2 website cover");
  });

  it("rejects a missing or short Article Body before calling the image service", async () => {
    expect(() => buildArticleCoverPrompt({ body: "" })).toThrow(
      `at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters`,
    );
    await expect(generateArticleCover({ body: "Short draft." })).rejects.toThrow(
      `at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters`,
    );
    expect(imageGenerationMocks.generateImage).not.toHaveBeenCalled();
  });

  it("passes the body-derived prompt to the image service and returns its durable result", async () => {
    imageGenerationMocks.generateImage.mockResolvedValue({
      key: "generated/lobby-routine.webp",
      url: "/manus-storage/lobby-routine.webp",
    });

    await expect(generateArticleCover({ body: articleBody })).resolves.toEqual({
      key: "generated/lobby-routine.webp",
      url: "/manus-storage/lobby-routine.webp",
    });
    expect(imageGenerationMocks.generateImage).toHaveBeenCalledWith({
      prompt: expect.stringContaining(articleBody),
    });
  });

  it("propagates upstream image failures for the router to sanitize", async () => {
    imageGenerationMocks.generateImage.mockRejectedValue(new Error("<html>504 Gateway Time-out</html>"));

    await expect(generateArticleCover({ body: articleBody })).rejects.toThrow("504 Gateway Time-out");
  });
});
