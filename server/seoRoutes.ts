import type { Express, Request } from "express";
import { legacyArchives, legacyArticles, normalizePath, pages, siteOrigin } from "../client/src/content/site";
import { getCanonicalRedirect, getPageSeo } from "../client/src/content/seo";
import { listPublishedArticles } from "./db";

const xmlEscape = (value: string) => value.replace(/[<>&'\"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] || character);
const ignoredPrefixes = ["/api/", "/oauth/", "/manus-storage/", "/__manus__/", "/src/", "/@vite/", "/node_modules/"];

type SitemapArticle = {
  path: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  publishedAt?: Date | null;
};

export function buildRobotsText() {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/",
    "Disallow: /oauth/",
    "",
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    "",
  ].join("\n");
}

export function buildSitemapXml(cmsArticles: SitemapArticle[] = []) {
  const entries = new Map<string, string | undefined>();
  for (const page of pages) {
    const seo = getPageSeo(page);
    if (seo.indexable && !getCanonicalRedirect(seo.path)) entries.set(seo.path, undefined);
  }
  entries.set("/category/blog/", undefined);
  for (const archive of legacyArchives) entries.set(normalizePath(archive.path), archive.publishedAt || undefined);
  for (const article of legacyArticles) entries.set(normalizePath(article.path), article.publishedAt || undefined);
  for (const article of cmsArticles) {
    const path = normalizePath(article.path);
    if (!getCanonicalRedirect(path)) entries.set(path, (article.updatedAt || article.publishedAt || article.createdAt)?.toISOString().slice(0, 10));
  }
  const urls = Array.from(entries.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, lastModified]) => [
      "  <url>",
      `    <loc>${xmlEscape(`${siteOrigin}${path}`)}</loc>`,
      ...(lastModified ? [`    <lastmod>${xmlEscape(lastModified.slice(0, 10))}</lastmod>`] : []),
      "  </url>",
    ].join("\n"));
  return [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`, ...urls, `</urlset>`, ""].join("\n");
}

function requestPath(req: Request) {
  return req.path.replace(/\/{2,}/g, "/") || "/";
}

export function getPermanentRedirect(path: string) {
  const cleanPath = path.replace(/\/{2,}/g, "/") || "/";
  if (cleanPath === "/index.html") return "/";
  const canonicalRedirect = getCanonicalRedirect(normalizePath(cleanPath));
  if (canonicalRedirect) return canonicalRedirect;
  if (cleanPath !== "/" && !cleanPath.endsWith("/") && !/\.[a-z0-9]{1,8}$/i.test(cleanPath)) return `${cleanPath}/`;
  return null;
}

export function registerSeoRoutes(app: Express) {
  app.use((req, res, next) => {
    if (!(["GET", "HEAD"].includes(req.method))) return next();
    const path = requestPath(req);
    if (ignoredPrefixes.some(prefix => path.startsWith(prefix)) || path === "/robots.txt" || path === "/sitemap.xml") return next();
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const destination = getPermanentRedirect(path);
    if (destination) return res.redirect(301, `${destination}${query}`);
    return next();
  });

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").set("Cache-Control", "public, max-age=300, s-maxage=300").send(buildRobotsText());
  });

  app.get("/sitemap.xml", async (_req, res) => {
    let cmsArticles: SitemapArticle[] = [];
    try {
      cmsArticles = await listPublishedArticles();
    } catch (error) {
      console.error("[SEO] Published CMS articles could not be added to sitemap", error);
    }
    res.type("application/xml").set("Cache-Control", "public, max-age=300, s-maxage=300").send(buildSitemapXml(cmsArticles));
  });
}
