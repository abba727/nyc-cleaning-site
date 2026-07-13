import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render } from "../client/src/entry-server";
import { legacyArticles } from "../client/src/content/site";

describe("public SEO rendering", () => {
  it("server-renders a canonical service page with LocalBusiness and breadcrumb schema", async () => {
    const result = await render("/services/commercial-cleaning-nyc/");
    expect(result.status).toBe(200);
    expect(result.head).toContain('<link rel="canonical" href="https://www.nyccleaning.co/services/commercial-cleaning-nyc/" />');
    expect(result.head).toContain('"@type":"LocalBusiness"');
    expect(result.head).toContain('"@type":"BreadcrumbList"');
    expect(result.html).toMatch(/Commercial Cleaning/i);
  });

  it("server-renders preserved articles with Article metadata", async () => {
    const article = legacyArticles[0];
    expect(article).toBeDefined();
    const result = await render(article.path);
    expect(result.status).toBe(200);
    expect(result.head).toContain('<meta property="og:type" content="article" />');
    expect(result.head).toContain('"@type":"Article"');
    expect(result.head).toContain(`https://www.nyccleaning.co${article.path}`);
    expect(result.html).toContain("NYC cleaning insights");
  });

  it("serves crawler-visible blog archives and real 404 status for unknown routes", async () => {
    expect((await render("/blog/")).status).toBe(200);
    expect((await render("/a-route-that-does-not-exist/")).status).toBe(404);
  });

  it.each([
    ["/services/", "/cleaning-service-nyc/"],
    ["/about/", "/about-us/"],
    ["/privacy-policy/", "/service-guru-app-privacy-policy/"],
    ["/commercial-cleaning-nyc/", "/services/commercial-cleaning-nyc/"],
  ])("server-renders public alias %s with canonical destination %s", async (alias, canonicalPath) => {
    const result = await render(alias);
    expect(result.status).toBe(200);
    expect(result.head).toContain(`<link rel="canonical" href="https://www.nyccleaning.co${canonicalPath}" />`);
  });

  it("publishes a clean sitemap and restrictive crawler directives", () => {
    const sitemap = readFileSync("client/public/sitemap.xml", "utf8");
    const robots = readFileSync("client/public/robots.txt", "utf8");
    expect((sitemap.match(/<url>/g) || []).length).toBeGreaterThanOrEqual(140);
    expect(sitemap).toContain("https://www.nyccleaning.co/services/commercial-cleaning-nyc/");
    expect(sitemap).toContain("https://www.nyccleaning.co/category/blog/");
    expect(sitemap).not.toContain("<loc>https://www.nyccleaning.co/blog/</loc>");
    expect(sitemap).not.toMatch(/<loc>[^<]*(?:wp-content|wp-json|\/feed\/|\?)[^<]*<\/loc>/);
    expect(robots).toContain("Sitemap: https://www.nyccleaning.co/sitemap.xml");
    expect(robots).toContain("Disallow: /api/");
  });
});
