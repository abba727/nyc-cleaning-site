import { z } from "zod";
import {
  ARTICLE_GENERATED_WORDS,
  ARTICLE_TOPIC_MAX_LENGTH,
  ARTICLE_TOPIC_MIN_LENGTH,
} from "@shared/articleSeo";
import { invokeLLM } from "./_core/llm";

const generatedArticleSchema = z.object({
  article: z.string().trim().min(600).max(3_000),
});

export type GeneratedArticle = z.infer<typeof generatedArticleSchema> & {
  wordCount: number;
};

export function countArticleWords(value: string) {
  const prose = value.replace(/^#{2,3}\s+/gm, "");
  return prose.match(/[A-Za-z0-9]+(?:[’'-][A-Za-z0-9]+)*/g)?.length ?? 0;
}

function validateGeneratedArticle(value: string): GeneratedArticle {
  const article = value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const wordCount = countArticleWords(article);
  const headingCount = article.match(/^##\s+\S.+$/gm)?.length ?? 0;

  if (headingCount < 2) {
    throw new Error("Generated article must include at least two section headings.");
  }
  if (wordCount < ARTICLE_GENERATED_WORDS.min || wordCount > ARTICLE_GENERATED_WORDS.max) {
    throw new Error(`Generated article contained ${wordCount} words instead of approximately ${ARTICLE_GENERATED_WORDS.target}.`);
  }

  return { article, wordCount };
}

async function requestArticle(topic: string, revisionNote?: string) {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: [
          "You write practical Insight articles for NYC Cleaning and Maintenance in natural American English.",
          `Write approximately ${ARTICLE_GENERATED_WORDS.target} words, staying between ${ARTICLE_GENERATED_WORDS.min} and ${ARTICLE_GENERATED_WORDS.max} words including headings.`,
          "Return an article body only, not a title. Begin with a concise introductory paragraph, include two or three useful Markdown H2 headings using ##, and finish with a short practical conclusion.",
          "Use readable paragraphs. Use a short bullet list only when it genuinely improves clarity. Do not use an H1 heading.",
          "Stay within the supplied topic. Do not invent statistics, certifications, guarantees, customer stories, legal requirements, prices, or unverifiable claims.",
          "Keep the tone helpful and professional rather than promotional. Do not include citations, links, metadata, or a call to contact the company.",
          "Return JSON matching the required schema only.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `Topic or brief:\n${topic}`,
          revisionNote ? `\nRevision requirement:\n${revisionNote}` : "",
        ].filter(Boolean).join("\n"),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "generated_insight_article",
        strict: true,
        schema: {
          type: "object",
          properties: {
            article: {
              type: "string",
              minLength: 600,
              maxLength: 3_000,
              description: `Approximately ${ARTICLE_GENERATED_WORDS.target} words of Markdown article body with two or three H2 headings.`,
            },
          },
          required: ["article"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The article-generation service returned no structured content.");
  }

  const parsed = generatedArticleSchema.parse(JSON.parse(content));
  return validateGeneratedArticle(parsed.article);
}

export async function generateArticleFromTopic(topic: string): Promise<GeneratedArticle> {
  const normalizedTopic = topic.replace(/\s+/g, " ").trim();
  if (normalizedTopic.length < ARTICLE_TOPIC_MIN_LENGTH) {
    throw new Error(`Topic must contain at least ${ARTICLE_TOPIC_MIN_LENGTH} characters.`);
  }
  if (normalizedTopic.length > ARTICLE_TOPIC_MAX_LENGTH) {
    throw new Error(`Topic must contain no more than ${ARTICLE_TOPIC_MAX_LENGTH.toLocaleString()} characters.`);
  }

  try {
    return await requestArticle(normalizedTopic);
  } catch (firstError) {
    const reason = firstError instanceof Error ? firstError.message : "The first draft did not meet the requested format.";
    return requestArticle(normalizedTopic, `${reason} Rewrite the article so it satisfies every heading and word-count requirement.`);
  }
}
