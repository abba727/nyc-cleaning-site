import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render } from "../client/src/entry-server";
import { brandAssets, homepageServiceImages } from "../client/src/content/assets";

describe("SEO delivery performance", () => {
  it("preloads the responsive homepage LCP image and renders matching sources", async () => {
    const result = await render("/");
    expect(result.head).toContain('<link rel="preload" as="image"');
    expect(result.head).toContain(brandAssets.heroResponsive.small);
    expect(result.head).toContain(brandAssets.heroResponsive.large);
    expect(result.head).toContain('fetchpriority="high"');
    expect(result.html).toContain(`src="${brandAssets.heroResponsive.large}"`);
    expect(result.html).toContain(`${brandAssets.heroResponsive.small} 960w`);
  });

  it("keeps below-fold card imagery lazy while prioritizing visible route heroes", async () => {
    const publicPageSource = readFileSync("client/src/components/PublicPage.tsx", "utf8");
    const result = await render("/");
    expect(publicPageSource).toContain('loading="lazy" decoding="async"');
    expect(publicPageSource).toContain('className="hero-bg" fetchPriority="high"');
    expect(publicPageSource).toContain('alt={articleImageAlt(content)} fetchPriority="high"');
    expect(Object.keys(homepageServiceImages)).toHaveLength(6);
    expect(Object.values(homepageServiceImages).every(src => src.endsWith(".webp"))).toBe(true);
    Object.values(homepageServiceImages).forEach(src => expect(result.html).toContain(src));
  });

  it("limits source-location instrumentation to development and emits production source maps", () => {
    const viteSource = readFileSync("vite.config.ts", "utf8");
    expect(viteSource).toContain('mode === "development" ? [jsxLocPlugin()] : []');
    expect(viteSource).toContain("sourcemap: true");
  });

  it("code-splits authenticated CMS routes away from the public entry bundle", () => {
    const appSource = readFileSync("client/src/App.tsx", "utf8");
    expect(appSource).toContain('const ArticleAdmin = lazy(() => import("./pages/ArticleAdmin"))');
    expect(appSource).toContain('const AdminUsers = lazy(() => import("./pages/AdminUsers"))');
    expect(appSource).toContain('const AdminInquiries = lazy(() => import("./pages/AdminInquiries"))');
    expect(appSource).not.toContain('import ArticleAdmin from "./pages/ArticleAdmin"');
  });

  it("resolves callback-based Vite config before creating the managed development server", () => {
    const viteServerSource = readFileSync("server/_core/vite.ts", "utf8");
    expect(viteServerSource).toContain('typeof viteConfig === "function"');
    expect(viteServerSource).toContain('command: "serve", mode: "development"');
    expect(viteServerSource).toContain("...resolvedViteConfig");
  });

  it("loads the global stylesheet from the document shell before hydration", () => {
    const documentShell = readFileSync("client/index.html", "utf8");
    const clientEntry = readFileSync("client/src/entry-client.tsx", "utf8");
    expect(documentShell).toContain('<link rel="stylesheet" href="/src/index.css" />');
    expect(clientEntry).not.toContain('import "./index.css"');
  });

  it("keeps the footer CTA eyebrow readable against its navy background", () => {
    const cssSource = readFileSync("client/src/index.css", "utf8");
    expect(cssSource).toContain(".footer-cta .eyebrow { color: #7fe0d8; }");
  });
});
