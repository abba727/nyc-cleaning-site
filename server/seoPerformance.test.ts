import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render } from "../client/src/entry-server";
import { brandAssets } from "../client/src/content/assets";
import { responsiveMedia } from "../client/src/content/responsive-media";
import { getPageImage, homepageServices } from "../client/src/content/site";

describe("SEO delivery performance", () => {
  it("preloads the responsive homepage LCP image and renders matching sources", async () => {
    const result = await render("/");
    expect(result.head).toContain('<link rel="preload" as="image"');
    expect(result.head).toContain(responsiveMedia.hero.avifSrcSet);
    expect(result.head).toContain(responsiveMedia.hero.sizes);
    expect(result.head).toContain('fetchpriority="high"');
    expect(result.html).toContain(`src="${brandAssets.hero}"`);
    expect(result.html).toContain(responsiveMedia.hero.fallbackSrcSet);
  });

  it("keeps below-fold card imagery lazy while prioritizing visible route heroes", async () => {
    const publicPageSource = readFileSync("client/src/components/PublicPage.tsx", "utf8");
    const result = await render("/");
    expect(publicPageSource).toContain('loading="lazy" decoding="async"');
    expect(publicPageSource).toContain('className="hero-bg" loading="eager" fetchPriority="high"');
    expect(homepageServices).toHaveLength(6);
    homepageServices.forEach(service => expect(result.html).toContain(getPageImage(service)));
  });

  it("limits source-location instrumentation to non-production builds", () => {
    const viteSource = readFileSync("vite.config.ts", "utf8");
    expect(viteSource).toContain('const isProductionBuild = command === "build";');
    expect(viteSource).toContain("...(!isProductionBuild");
    expect(viteSource).toContain("jsxLocPlugin()");
  });

  it("code-splits the authenticated CMS away from the public entry bundle", () => {
    const appSource = readFileSync("client/src/App.tsx", "utf8");
    expect(appSource).toContain('const AdminApp = lazy(() => import("./components/AdminApp"))');
    expect(appSource).not.toContain('import ArticleAdmin from "./pages/ArticleAdmin"');
    expect(appSource).not.toContain('import AdminUsers from "./pages/AdminUsers"');
    expect(appSource).not.toContain('import AdminInquiries from "./pages/AdminInquiries"');
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
