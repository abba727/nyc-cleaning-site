import { z } from "zod";
import {
  ARTICLE_BODY_MAX_GENERATION_LENGTH,
  ARTICLE_BODY_MIN_GENERATION_LENGTH,
  ARTICLE_TITLE_SUGGESTION_MAX_LENGTH,
} from "@shared/articleSeo";
import { invokeLLM } from "./_core/llm";

const generatedTitleSchema = z.object({
  title: z.string().trim().min(10).max(ARTICLE_TITLE_SUGGESTION_MAX_LENGTH),
});

function normalizeTitle(value: string) {
  const normalized = value.replace(/^#+\s*/, "").replace(/^["“”']+|["“”']+$/g, "").replace(/\s+/g, " ").trim();
  if (normalized.length <= ARTICLE_TITLE_SUGGESTION_MAX_LENGTH) return normalized;
  const clipped = normalized.slice(0, ARTICLE_TITLE_SUGGESTION_MAX_LENGTH + 1);
  const wordBoundary = clipped.lastIndexOf(" ");
  const safeBoundary = wordBoundary >= 70 ? wordBoundary : ARTICLE_TITLE_SUGGESTION_MAX_LENGTH;
  return clipped.slice(0, safeBoundary).replace(/[\s,;:–—-]+$/g, "").trim();
}

export async function generateArticleTitleSuggestion(body: string) {
  const normalizedBody = body.trim();
  if (normalizedBody.length < ARTICLE_BODY_MIN_GENERATION_LENGTH) {
    throw new Error(`Article body must contain at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters.`);
  }
  if (normalizedBody.length > ARTICLE_BODY_MAX_GENERATION_LENGTH) {
    throw new Error(`Article body must contain no more than ${ARTICLE_BODY_MAX_GENERATION_LENGTH} characters.`);
  }

  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: [
          "You write accurate, specific editorial titles for NYC Cleaning and Maintenance Insight articles.",
          "Derive the title only from the supplied Article Body. Do not invent facts, locations, statistics, guarantees, or services.",
          "Use natural American English, title case, and a useful reader-focused angle. Avoid quotation marks, clickbait, keyword stuffing, and company-name suffixes.",
          `Return one title no longer than ${ARTICLE_TITLE_SUGGESTION_MAX_LENGTH} characters as JSON matching the required schema.`,
        ].join(" "),
      },
      {
        role: "user",
        content: `Suggest an Insight title from this Article Body:\n\n${normalizedBody}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "article_title_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              minLength: 10,
              maxLength: ARTICLE_TITLE_SUGGESTION_MAX_LENGTH,
              description: "A specific editorial title derived only from the Article Body.",
            },
          },
          required: ["title"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The title-generation service returned no structured content.");
  }
  const raw = JSON.parse(content) as Record<string, unknown>;
  return generatedTitleSchema.parse({ title: normalizeTitle(String(raw.title ?? "")) });
}
