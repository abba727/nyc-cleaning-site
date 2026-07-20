import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render } from "../client/src/entry-server";
import { pages, siteOrigin } from "../client/src/content/site";
import { legacyArchives, legacyArticles } from "../client/src/content/legacy-content";
import { canonicalRedirects, getArchiveSeo, getLegacySeo, getPageSeo, SEO_DESCRIPTION_MAX_LENGTH, SEO_TITLE_MAX_LENGTH } from "../client/src/content/seo";
import { buildRobotsText, buildSitemapXml, getPermanentRedirect } from "./seoRoutes";

describe("public SEO rendering", () => {
  it("server-renders a canonical service page with concise metadata and organization breadcrumbs", async () => {
    const result = await render("/services/commercial-cleaning-nyc/");
    expect(result.status).toBe(200);
    expect(result.head).toContain('<link rel="canonical" href="https://www.nyccleaning.co/services/commercial-cleaning-nyc/" />');
    expect(result.head).toContain('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />');
    expect(result.head).toContain('"@type":["LocalBusiness","Organization"]');
    expect(result.head).toContain('"@type":"BreadcrumbList"');
    expect(result.html).toMatch(/Commercial Cleaning/i);
  });

  it("server-renders preserved articles with complete Article metadata", async () => {
    const article = legacyArticles[0];
    const result = await render(article.path);
    expect(result.status).toBe(200);
    expect(result.head).toContain('<meta property="og:type" content="article" />');
    expect(result.head).toContain('"@type":"Article"');
    expect(result.head).toContain('"datePublished"');
    expect(result.head).toContain('"dateModified"');
    expect(result.head).toContain('"author":{"@id":"https://www.nyccleaning.co/#localbusiness"}');
    expect(result.head).toContain('"publisher":{"@id":"https://www.nyccleaning.co/#localbusiness"}');
    expect(result.head).toContain('"@type":"ImageObject"');
    expect(result.head).toContain(`https://www.nyccleaning.co${article.path}`);
    expect(result.html).toContain("NYC cleaning insights");
  });

  it("server-renders the canonical blog archive as linked visual article cards", async () => {
    const archive = await render("/blog/");
    expect(archive.status).toBe(200);
    expect(archive.head).toContain('<link rel="canonical" href="https://www.nyccleaning.co/blog/" />');
    expect(archive.html).toContain("Insights for New York properties");
    expect(archive.html).toContain("article-card-image");
    expect(archive.html).toContain("Read article");
    expect((archive.html.match(/class=\"article-card\"/g) || []).length).toBe(9);
    expect(archive.html).not.toContain("Explore by month");
    expect(archive.html).toContain("Turn helpful insight into dependable property care.");
    expect(archive.html).toContain("Commercial Cleaning");
    expect(archive.html).toContain("Deep Cleaning");
    expect(archive.html).toContain("Porter Services");
  });

  it("returns distinct crawler states for archives, legal pages, admin, and missing routes", async () => {
    const archive = await render("/2025/06/");
    expect(archive.status).toBe(200);
    expect(archive.head).toContain("June 2025 Cleaning Insights");
    expect(archive.head).toContain('content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"');

    const legal = await render("/service-guru-app-privacy-policy/");
    expect(legal.status).toBe(200);
    expect(legal.head).toContain('content="noindex, follow"');

    const admin = await render("/admin/");
    expect(admin.status).toBe(200);
    expect(admin.head).toContain("Owner Workspace | NYC Cleaning");
    expect(admin.head).toContain('content="noindex, follow"');

    const missing = await render("/a-route-that-does-not-exist/");
    expect(missing.status).toBe(404);
    expect(missing.head).toContain("Page Not Found | NYC Cleaning");
    expect(missing.head).toContain('content="noindex, follow"');
    expect(missing.head).not.toContain("NYC Cleaning &amp; Building Maintenance Services");
    expect(missing.head).toContain("window.__INITIAL_NOT_FOUND_PATH__=");
    expect(missing.html).toContain("That page could not be found.");
    expect(missing.html).not.toContain("Loading article");
  });
});

describe("SEO metadata inventory", () => {
  it("keeps every canonical static title unique and within the search-title limit", () => {
    const metadata = [
      ...pages.map(getPageSeo).filter(item => item.indexable),
      ...legacyArticles.map(getLegacySeo),
      ...legacyArchives.map(getLegacySeo),
      getArchiveSeo("/blog/"),
    ];
    const titles = metadata.map(item => item.title.toLocaleLowerCase("en-US"));
    expect(new Set(titles).size).toBe(titles.length);
    expect(metadata.every(item => item.title.length > 10 && item.title.length <= SEO_TITLE_MAX_LENGTH)).toBe(true);
    expect(metadata.every(item => item.description.length > 50 && item.description.length <= SEO_DESCRIPTION_MAX_LENGTH)).toBe(true);
  });

  it("maps every historical alias and slashless HTML route to one canonical destination", () => {
    for (const [alias, canonical] of Object.entries(canonicalRedirects)) {
      expect(getPermanentRedirect(alias)).toBe(canonical);
    }
    expect(getPermanentRedirect("/about-us")).toBe("/about-us/");
    expect(getPermanentRedirect("/index.html")).toBe("/");
    expect(getPermanentRedirect("/robots.txt")).toBeNull();
    expect(getPermanentRedirect("/about-us/")).toBeNull();
  });
});

describe("crawl controls", () => {
  it("builds a canonical sitemap with accurate legacy dates and published CMS Insights", () => {
    const xml = buildSitemapXml([{ path: "/cms-seo-guide/", updatedAt: new Date("2026-07-16T18:00:00.000Z") }]);
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    expect(new Set(locations).size).toBe(locations.length);
    expect(xml).toContain(`<loc>${siteOrigin}/cms-seo-guide/</loc>`);
    expect(xml).toContain("<lastmod>2026-07-16</lastmod>");
    expect(xml).toContain(`<loc>${siteOrigin}/blog/</loc>`);
    expect(xml).not.toContain(`<loc>${siteOrigin}/category/blog/</loc>`);
    expect(xml).not.toContain(`<loc>${siteOrigin}/service-guru-app-privacy-policy/</loc>`);
    expect(xml).not.toContain(`<loc>${siteOrigin}/privacy-policy/</loc>`);
  });

  it("serves explicit crawler exclusions and keeps the generated fallbacks aligned", () => {
    const robots = buildRobotsText();
    const staticRobots = readFileSync("client/public/robots.txt", "utf8");
    const staticSitemap = readFileSync("client/public/sitemap.xml", "utf8");
    expect(robots).toContain("Disallow: /admin/");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Disallow: /oauth/");
    expect(robots).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`);
    expect(staticRobots).toBe(robots);
    expect(staticSitemap).toContain(`<loc>${siteOrigin}/services/commercial-cleaning-nyc/</loc>`);
    expect(staticSitemap).toContain(`<loc>${siteOrigin}/blog/</loc>`);
    expect(staticSitemap).not.toContain(`<loc>${siteOrigin}/category/blog/</loc>`);
    expect(staticSitemap).not.toContain(`<loc>${siteOrigin}/service-guru-app-privacy-policy/</loc>`);
    expect(staticSitemap).not.toMatch(/<loc>[^<]*(?:wp-content|wp-json|\/feed\/|\?)[^<]*<\/loc>/);
  });
});
