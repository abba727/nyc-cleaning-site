import { generateImage } from "./_core/imageGeneration";
import { ARTICLE_BODY_MAX_GENERATION_LENGTH, ARTICLE_BODY_MIN_GENERATION_LENGTH } from "@shared/articleSeo";

const ARTICLE_COVER_CONTEXT_MAX_LENGTH = 12_000;

export type ArticleCoverInput = {
  body: string;
  title?: string;
  excerpt?: string;
  direction?: string;
};

function normalizeContext(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildArticleCoverPrompt(input: ArticleCoverInput) {
  const normalizedBody = normalizeContext(input.body);
  if (normalizedBody.length < ARTICLE_BODY_MIN_GENERATION_LENGTH) {
    throw new Error(`Write at least ${ARTICLE_BODY_MIN_GENERATION_LENGTH} characters in the Article Body before generating a cover image.`);
  }
  if (normalizedBody.length > ARTICLE_BODY_MAX_GENERATION_LENGTH) {
    throw new Error(`Keep the Article Body under ${ARTICLE_BODY_MAX_GENERATION_LENGTH.toLocaleString()} characters before generating a cover image.`);
  }
  const articleBody = normalizedBody.slice(0, ARTICLE_COVER_CONTEXT_MAX_LENGTH);
  const supportingContext = [
    input.title?.trim() ? `Article title: ${input.title.trim()}.` : "",
    input.excerpt?.trim() ? `Article excerpt: ${input.excerpt.trim()}.` : "",
  ].filter(Boolean).join(" ");
  const optionalDirection = input.direction?.trim()
    ? `Optional visual direction from the editor: ${input.direction.trim()}. Follow it only when it remains accurate to the article.`
    : "";

  return [
    "Create a realistic, premium editorial cover photograph for NYC Cleaning and Maintenance, a professional New York City property services company.",
    "Derive the image subject primarily from the Article Body below. Select one clear, visually specific scene that accurately represents the article instead of creating a generic cleaning image.",
    supportingContext,
    `Article Body:\n${articleBody}`,
    optionalDirection,
    "Use believable New York property details, clean natural lighting, navy and subtle teal visual accents, and a polished commercial photography style.",
    "Do not include text, logos, watermarks, distorted architecture, unsafe work practices, invented certifications, or exaggerated before-and-after effects.",
    "Compose the image as a horizontal 3:2 website cover with a clear focal point and enough visual breathing room for responsive cropping.",
  ].filter(Boolean).join("\n\n");
}

export async function generateArticleCover(input: ArticleCoverInput) {
  return generateImage({ prompt: buildArticleCoverPrompt(input) });
}
