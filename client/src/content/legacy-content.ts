import rawLegacyContent from "./legacy-articles.json";
import rawArticleImages from "./article-images.json";
import { brandAssets } from "./assets";
import { normalizePath, type LegacyContent } from "./site";

export const legacyContent = rawLegacyContent as LegacyContent[];
export const legacyArticles = legacyContent.filter(item => item.kind === "article");
export const legacyArchives = legacyContent.filter(item => item.kind === "archive");
export const legacyArticleImages = rawArticleImages as Record<string, { src: string; alt: string }>;

export const getLegacyByPath = (path: string) =>
  legacyContent.find(item => normalizePath(item.path) === normalizePath(path));

export const getArticleImage = (content: LegacyContent) =>
  legacyArticleImages[normalizePath(content.path)]?.src || brandAssets.hero;

export const getArticleImageAlt = (content: LegacyContent) =>
  legacyArticleImages[normalizePath(content.path)]?.alt || `Editorial image for ${content.title}`;

export const articlesForArchive = (path: string) => {
  const match = normalizePath(path).match(/^\/(\d{4})\/(\d{2})\/$/);
  if (!match) return legacyArticles;
  const [, year, month] = match;
  return legacyArticles.filter(article => article.publishedAt.startsWith(`${year}-${month}-`));
};
