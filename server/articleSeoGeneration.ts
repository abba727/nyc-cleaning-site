import { z } from "zod";
import {
  ARTICLE_BODY_MAX_GENERATION_LENGTH,
  ARTICLE_BODY_MIN_GENERATION_LENGTH,
  ARTICLE_SEO_LIMITS,
} from "@shared/articleSeo";
import { invokeLLM } from "./_core/llm";

const generatedSeoFieldsSchema = z.object({
  seoTitle: z.string().trim().min(10).max(ARTICLE_SEO_LIMITS.seoTitle),
  metaDescription: z.string().trim().min(40).max(ARTICLE_SEO_LIMITS.metaDescription),
  excerpt: z.string().trim().min(40).max(ARTICLE_SEO_LIMITS.excerpt),
});

export type GeneratedSeoFields = z.infer<typeof generatedSeoFieldsSchema>;

function normalizeGeneratedText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;

  const clipped = normalized.slice(0, limit + 1);
  const wordBoundary = clipped.lastIndexOf(" ");
  const safeBoundary = wordBoundary >= Math.floor(limit * 0.7) ? wordBoundary : limit;
  return clipped.slice(0, safeBoundary).replace(/[\s,;:–—-]+$/g, "").trim();
}

export async function generateArticleSeoFields(body: string): Promise<GeneratedSeoFields> {
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
          "You write accurate, concise search metadata for NYC Cleaning and Maintenance Insight articles.",
          "Use only facts and topics present in the supplied article body. Do not invent claims, statistics, locations, services, guarantees, or calls to action.",
          "Write natural, reader-focused American English. Avoid quotation marks, keyword stuffing, clickbait, and repeated wording across fields.",
          `The SEO title must be no more than ${ARTICLE_SEO_LIMITS.seoTitle} characters and clearly state the article topic.`,
          `The meta description must be no more than ${ARTICLE_SEO_LIMITS.metaDescription} characters and summarize the practical value of the article.`,
          `The excerpt must be no more than ${ARTICLE_SEO_LIMITS.excerpt} characters and work as a useful Insights archive summary.`,
          "Return JSON matching the required schema only.",
        ].join(" "),
      },
      {
        role: "user",
        content: `Generate the SEO title, meta description, and excerpt from this article body:\n\n${normalizedBody}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "article_seo_fields",
        strict: true,
        schema: {
          type: "object",
          properties: {
            seoTitle: {
              type: "string",
              minLength: 10,
              maxLength: ARTICLE_SEO_LIMITS.seoTitle,
              description: "Concise search result title derived only from the article body.",
            },
            metaDescription: {
              type: "string",
              minLength: 40,
              maxLength: ARTICLE_SEO_LIMITS.metaDescription,
              description: "Search meta description derived only from the article body.",
            },
            excerpt: {
              type: "string",
              minLength: 40,
              maxLength: ARTICLE_SEO_LIMITS.excerpt,
              description: "Insights archive excerpt derived only from the article body.",
            },
          },
          required: ["seoTitle", "metaDescription", "excerpt"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The text-generation service returned no structured content.");
  }

  const raw = JSON.parse(content) as Record<string, unknown>;
  return generatedSeoFieldsSchema.parse({
    seoTitle: normalizeGeneratedText(String(raw.seoTitle ?? ""), ARTICLE_SEO_LIMITS.seoTitle),
    metaDescription: normalizeGeneratedText(String(raw.metaDescription ?? ""), ARTICLE_SEO_LIMITS.metaDescription),
    excerpt: normalizeGeneratedText(String(raw.excerpt ?? ""), ARTICLE_SEO_LIMITS.excerpt),
  });
}
