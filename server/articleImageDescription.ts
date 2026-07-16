import { z } from "zod";
import {
  ARTICLE_BODY_MAX_GENERATION_LENGTH,
  ARTICLE_BODY_MIN_GENERATION_LENGTH,
  ARTICLE_IMAGE_DESCRIPTION_MAX_LENGTH,
} from "@shared/articleSeo";
import type { ArticleCoverInput } from "./articleCoverGeneration";
import { invokeLLM } from "./_core/llm";

const generatedDescriptionSchema = z.object({
  description: z.string().trim().min(20).max(ARTICLE_IMAGE_DESCRIPTION_MAX_LENGTH),
});

function normalizeDescription(value: string) {
  const normalized = value.replace(/^#+\s*/, "").replace(/^["“”']+|["“”']+$/g, "").replace(/\s+/g, " ").trim();
  if (normalized.length <= ARTICLE_IMAGE_DESCRIPTION_MAX_LENGTH) return normalized;
  const clipped = normalized.slice(0, ARTICLE_IMAGE_DESCRIPTION_MAX_LENGTH + 1);
  const wordBoundary = clipped.lastIndexOf(" ");
  const safeBoundary = wordBoundary >= 120 ? wordBoundary : ARTICLE_IMAGE_DESCRIPTION_MAX_LENGTH;
  return clipped.slice(0, safeBoundary).replace(/[\s,;:–—-]+$/g, "").trim();
}

function bodySubject(body: string) {
  return body
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/[.!?]/)[0]
    .slice(0, 120)
    .trim();
}

export function fallbackArticleCoverDescription(input: ArticleCoverInput) {
  const subject = input.title?.trim() || bodySubject(input.body) || "the article topic";
  return normalizeDescription(`Editorial cover illustrating ${subject}`);
}

export async function generateArticleCoverDescription(input: ArticleCoverInput, imageUrl: string) {
  const normalizedBody = input.body.trim();
  if (normalizedBody.length < ARTICLE_BODY_MIN_GENERATION_LENGTH) {
    throw new Error(`Article body must contain at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters.`);
  }
  if (normalizedBody.length > ARTICLE_BODY_MAX_GENERATION_LENGTH) {
    throw new Error(`Article body must contain no more than ${ARTICLE_BODY_MAX_GENERATION_LENGTH} characters.`);
  }
  const validatedImageUrl = z.string().url().parse(imageUrl);

  const context = [
    input.title?.trim() ? `Article title: ${input.title.trim()}` : "",
    input.direction?.trim() ? `Editor visual direction: ${input.direction.trim()}` : "",
    `Article Body:\n${normalizedBody.slice(0, 12_000)}`,
  ].filter(Boolean).join("\n\n");

  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content: [
          "Write concise, accessible alt text for the supplied editorial cover image.",
          "Describe only details visibly present in the image. Use the article context only to disambiguate visible subjects, never to add people, objects, locations, or actions that are not shown.",
          "Use 8 to 22 words. Do not begin with Image of or Picture of. Do not mention AI, branding, mood, photographic style, or unsupported claims.",
          `Return a description no longer than ${ARTICLE_IMAGE_DESCRIPTION_MAX_LENGTH} characters as JSON matching the required schema.`,
        ].join(" "),
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Describe the actual generated cover image using this supporting article context:\n\n${context}` },
          { type: "image_url", image_url: { url: validatedImageUrl, detail: "auto" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "article_cover_description",
        strict: true,
        schema: {
          type: "object",
          properties: {
            description: {
              type: "string",
              minLength: 20,
              maxLength: ARTICLE_IMAGE_DESCRIPTION_MAX_LENGTH,
              description: "Concise accessible description of details visible in the generated cover image.",
            },
          },
          required: ["description"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The image-description service returned no structured content.");
  }
  const raw = JSON.parse(content) as Record<string, unknown>;
  return generatedDescriptionSchema.parse({ description: normalizeDescription(String(raw.description ?? "")) }).description;
}
