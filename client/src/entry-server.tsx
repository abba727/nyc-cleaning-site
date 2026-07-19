import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import App from "./App";
import { brandAssets } from "./content/assets";
import { getArticleImage, getLegacyByPath, legacyArticleImages, legacyContent } from "./content/legacy-content";
import { responsiveMedia } from "./content/responsive-media";
import { company, getPageByPath, getPageImage, isBlogArchivePath, normalizePath, pages, siteOrigin } from "./content/site";
import { getArchiveSeo, getLegacySeo, getPageSeo } from "./content/seo";
import type { LegacyContentPayload } from "./contexts/LegacyContentContext";
import { getPublishedArticleByPath } from "../../server/db";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
const ARTICLE_LOOKUP_TIMEOUT_MS = 2_000;

async function getCmsArticleForRender(pathname: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getPublishedArticleByPath(pathname),
      new Promise<undefined>(resolve => {
        timeout = setTimeout(() => resolve(undefined), ARTICLE_LOOKUP_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function isKnownPublicPath(url: string) {
  return Boolean(getPageByPath(url) || getLegacyByPath(url) || isBlogArchivePath(url));
}

export async function render(url: string) {
  const pathname = normalizePath(url);
  const matchedPage = getPageByPath(pathname);
  const matchedLegacy = getLegacyByPath(pathname);
  const isSyntheticArchive = isBlogArchivePath(pathname);
  const cmsArticle = !matchedPage && !matchedLegacy && !isSyntheticArchive
    ? await getCmsArticleForRender(pathname)
    : undefined;
  const page = matchedPage || pages[0];
  const isNotFound = !matchedPage && !matchedLegacy && !isSyntheticArchive && !cmsArticle;
  const seo = cmsArticle
    ? { path: cmsArticle.path, title: cmsArticle.seoTitle || cmsArticle.title, description: cmsArticle.metaDescription || cmsArticle.excerpt || cmsArticle.description, h1: cmsArticle.title, kind: "blog" }
    : matchedLegacy
      ? getLegacySeo(matchedLegacy)
      : isSyntheticArchive
        ? getArchiveSeo(pathname)
        : getPageSeo(page);
  const legacyPayload: LegacyContentPayload | null = matchedLegacy || isSyntheticArchive
    ? { content: legacyContent, images: legacyArticleImages }
    : null;
  const queryClient = new QueryClient();
  const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: `${siteOrigin}/api/trpc`, transformer: superjson })] });
  const html = renderToString(
    <React.StrictMode>
      <Router ssrPath={pathname}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}><App legacyContent={legacyPayload} initialArticle={cmsArticle || null} initialNotFoundPath={isNotFound ? pathname : null} /></QueryClientProvider>
        </trpc.Provider>
      </Router>
    </React.StrictMode>
  );

  const canonical = `${siteOrigin}${normalizePath(seo.path)}`;
  const image = cmsArticle?.coverImageUrl || (matchedLegacy?.kind === "article" ? getArticleImage(matchedLegacy) : matchedLegacy || isSyntheticArchive ? brandAssets.hero : getPageImage(page));
  const imageUrl = image.startsWith("http") ? image : `${siteOrigin}${image}`;
  const crumbs = [{ name: "Home", item: `${siteOrigin}/` }];
  if (seo.path !== "/") crumbs.push({ name: seo.h1.replace(/\s*\|.*$/, ""), item: canonical });
  const isArticle = Boolean(cmsArticle || matchedLegacy?.kind === "article");
  const pageSchema = { "@type": isArticle ? "Article" : "WebPage", "@id": `${canonical}#webpage`, url: canonical, name: seo.title, headline: isArticle ? seo.h1 : undefined, datePublished: cmsArticle?.publishedAt?.toISOString() || matchedLegacy?.publishedAt || undefined, image: imageUrl, description: seo.description, isPartOf: { "@id": `${siteOrigin}/#website` } };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${siteOrigin}/#localbusiness`,
        name: company.name,
        url: siteOrigin,
        image: `${siteOrigin}${brandAssets.logo}`,
        telephone: company.phoneDisplay,
        email: company.email,
        address: { "@type": "PostalAddress", streetAddress: "P.O. Box 660009", addressLocality: "Fresh Meadows", addressRegion: "NY", postalCode: "11366", addressCountry: "US" },
        areaServed: { "@type": "City", name: "New York City" },
      },
      { "@type": "WebSite", "@id": `${siteOrigin}/#website`, url: siteOrigin, name: company.name },
      pageSchema,
      { "@type": "BreadcrumbList", itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: crumb.item })) },
    ],
  };

  const homeHeroPreload = pathname === "/"
    ? `<link rel="preload" as="image" type="image/avif" href="/manus-storage/responsive-media/nyc-cleaning-hero-v2_40f4e363-800w.avif" imagesrcset="${responsiveMedia.hero.avifSrcSet}" imagesizes="${responsiveMedia.hero.sizes}" fetchpriority="high" />`
    : "";

  const legacyHydration = legacyPayload
    ? `<script>window.__NYC_LEGACY_CONTENT__=${safeJson(legacyPayload)};</script>`
    : "";
  const initialArticleHydration = cmsArticle
    ? `<script>window.__INITIAL_ARTICLE__=${safeJson(cmsArticle)};</script>`
    : "";
  const initialNotFoundHydration = isNotFound
    ? `<script>window.__INITIAL_NOT_FOUND_PATH__=${safeJson(pathname)};</script>`
    : "";

  const head = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="${isNotFound ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    homeHeroPreload,
    legacyHydration,
    initialArticleHydration,
    initialNotFoundHydration,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:type" content="${isArticle || seo.kind === "blog" ? "article" : "website"}" />`,
    `<meta property="og:site_name" content="${escapeHtml(company.name)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
    `<script type="application/ld+json">${safeJson(schema)}</script>`,
  ].join("\n    ");
  return { html, head, status: isNotFound ? 404 : 200 };
}
