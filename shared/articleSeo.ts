export const ARTICLE_SEO_LIMITS = {
  seoTitle: 60,
  metaDescription: 160,
  excerpt: 300,
} as const;

export const ARTICLE_BODY_MIN_GENERATION_LENGTH = 200;
export const ARTICLE_BODY_MAX_GENERATION_LENGTH = 60_000;

export const ARTICLE_TOPIC_MIN_LENGTH = 10;
export const ARTICLE_TOPIC_MAX_LENGTH = 2_000;
export const ARTICLE_GENERATED_WORDS = {
  target: 200,
  min: 170,
  max: 230,
} as const;
