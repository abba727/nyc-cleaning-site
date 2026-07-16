export const INSIGHT_CANONICAL_ROOT = "/insights/";

export function normalizeArticleSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180)
    .replace(/-+$/g, "");
}

export function canonicalInsightPath(slug: string) {
  const normalized = normalizeArticleSlug(slug);
  return normalized ? `${INSIGHT_CANONICAL_ROOT}${normalized}/` : INSIGHT_CANONICAL_ROOT;
}
