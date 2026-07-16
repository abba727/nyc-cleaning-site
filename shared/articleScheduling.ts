export type ArticlePublicationState = "draft" | "scheduled" | "published";

type SchedulableArticle = {
  status: "draft" | "published";
  publishedAt?: Date | string | null;
};

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getArticlePublicationState(
  article: SchedulableArticle,
  now = new Date(),
): ArticlePublicationState {
  if (article.status === "draft") return "draft";
  const publishedAt = asDate(article.publishedAt);
  if (publishedAt && publishedAt.getTime() > now.getTime()) return "scheduled";
  return "published";
}

export function isArticlePublic(article: SchedulableArticle, now = new Date()) {
  return getArticlePublicationState(article, now) === "published";
}
