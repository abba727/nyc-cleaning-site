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
import { getPublishedArticleByPath, getSiteSettings, listPublishedArticles } from "../../server/db";
import { toPublicMediaUrl } from "../../server/storage";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
const ARTICLE_LOOKUP_TIMEOUT_MS = 2_000;
const THANK_YOU_PATH = "/thank-you/";
const GA4_MEASUREMENT_ID = /^G-[A-Z0-9-]+$/;
const GTM_CONTAINER_ID = /^GTM-[A-Z0-9-]+$/;

type TrackingSettings = {
  googleAnalyticsMeasurementId: string | null;
  googleTagManagerContainerId: string | null;
};

function getTrackingMarkup(settings: TrackingSettings | null) {
  const measurementId = settings?.googleAnalyticsMeasurementId?.trim().toUpperCase() || "";
  const containerId = settings?.googleTagManagerContainerId?.trim().toUpperCase() || "";

  if (GTM_CONTAINER_ID.test(containerId)) {
    const safeContainerId = escapeHtml(containerId);
    return {
      head: `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${safeContainerId}');</script>`,
      body: `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${safeContainerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
    };
  }

  if (GA4_MEASUREMENT_ID.test(measurementId)) {
    const safeMeasurementId = escapeHtml(measurementId);
    return {
      head: `<script async src="https://www.googletagmanager.com/gtag/js?id=${safeMeasurementId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${safeMeasurementId}');</script>`,
      body: "",
    };
  }

  return { head: "", body: "" };
}

async function getCmsArticleForRender(pathname: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const article = await Promise.race([
      getPublishedArticleByPath(pathname),
      new Promise<undefined>(resolve => {
        timeout = setTimeout(() => resolve(undefined), ARTICLE_LOOKUP_TIMEOUT_MS);
      }),
    ]);
    return article ? { ...article, coverImageUrl: toPublicMediaUrl(article.coverImageUrl) } : article;
  } catch {
    return undefined;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function getLatestCmsArticlesForRender() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const articles = await Promise.race([
      listPublishedArticles(),
      new Promise<undefined>(resolve => {
        timeout = setTimeout(() => resolve(undefined), ARTICLE_LOOKUP_TIMEOUT_MS);
      }),
    ]);
    return articles ? articles.slice(0, 3).map(article => ({ ...article, coverImageUrl: toPublicMediaUrl(article.coverImageUrl) })) : [];
  } catch {
    return [];
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function isKnownPublicPath(url: string) {
  return Boolean(getPageByPath(url) || getLegacyByPath(url) || isBlogArchivePath(url) || normalizePath(url) === THANK_YOU_PATH);
}

export async function render(url: string) {
  const pathname = normalizePath(url);
  const matchedPage = getPageByPath(pathname);
  const matchedLegacy = getLegacyByPath(pathname);
  const isSyntheticArchive = isBlogArchivePath(pathname);
  const isThankYou = pathname === THANK_YOU_PATH;
  const isAdminPath = pathname === "/admin/" || pathname.startsWith("/admin/");
  const trackingSettings = isAdminPath
    ? null
    : await getSiteSettings().catch(error => {
      console.error("[Tracking] CMS settings could not be loaded", error);
      return null;
    });
  const trackingMarkup = getTrackingMarkup(trackingSettings);
  const cmsArticle = !isAdminPath && !isThankYou && !matchedPage && !matchedLegacy && !isSyntheticArchive
    ? await getCmsArticleForRender(pathname)
    : undefined;
  const initialInsights = pathname === "/" ? await getLatestCmsArticlesForRender() : [];
  const page = matchedPage || pages[0];
  const isNotFound = !isAdminPath && !isThankYou && !matchedPage && !matchedLegacy && !isSyntheticArchive && !cmsArticle;
  const seo = isAdminPath
    ? { path: pathname, title: "Owner Workspace | NYC Cleaning", description: "Private NYC Cleaning content management workspace.", h1: "Owner Workspace", kind: "admin", indexable: false }
    : isThankYou
      ? { path: THANK_YOU_PATH, title: "Thank You | NYC Cleaning", description: "Thank you for contacting NYC Cleaning. Our team will follow up about your property-care request.", h1: "Thank You", kind: "core", indexable: false }
    : isNotFound
      ? { path: pathname, title: "Page Not Found | NYC Cleaning", description: "The requested NYC Cleaning page could not be found.", h1: "Page Not Found", kind: "not_found", indexable: false }
      : cmsArticle
      ? { path: cmsArticle.path, title: cmsArticle.seoTitle || cmsArticle.title, description: cmsArticle.metaDescription || cmsArticle.excerpt || cmsArticle.description, h1: cmsArticle.title, kind: "blog", indexable: true }
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
          <QueryClientProvider client={queryClient}><App legacyContent={legacyPayload} initialArticle={cmsArticle || null} initialNotFoundPath={isNotFound ? pathname : null} initialInsights={initialInsights} /></QueryClientProvider>
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
  const articlePublishedAt = cmsArticle?.publishedAt?.toISOString() || matchedLegacy?.publishedAt;
  const articleModifiedAt = cmsArticle?.updatedAt?.toISOString() || articlePublishedAt;
  const pageSchema = {
    "@type": isArticle ? "Article" : "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: seo.title,
    headline: isArticle ? seo.h1 : undefined,
    datePublished: isArticle ? articlePublishedAt : undefined,
    dateModified: isArticle ? articleModifiedAt : undefined,
    image: isArticle ? { "@type": "ImageObject", url: imageUrl } : imageUrl,
    author: isArticle ? { "@id": `${siteOrigin}/#localbusiness` } : undefined,
    publisher: isArticle ? { "@id": `${siteOrigin}/#localbusiness` } : undefined,
    description: seo.description,
    isPartOf: { "@id": `${siteOrigin}/#website` },
  };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["LocalBusiness", "Organization"],
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
    ? `<link rel="preload" as="image" type="image/avif" href="/media/responsive-media/nyc-cleaning-hero-v2_40f4e363-800w.avif" imagesrcset="${responsiveMedia.hero.avifSrcSet}" imagesizes="${responsiveMedia.hero.sizes}" fetchpriority="high" />`
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
  const initialInsightsHydration = initialInsights.length
    ? `<script>window.__INITIAL_INSIGHTS__=${safeJson(initialInsights)};</script>`
    : "";

  const head = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="${isNotFound || seo.indexable === false ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    homeHeroPreload,
    legacyHydration,
    initialArticleHydration,
    initialNotFoundHydration,
    initialInsightsHydration,
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
    trackingMarkup.head,
  ].filter(Boolean).join("\n    ");
  return { html, head, body: trackingMarkup.body, status: isNotFound ? 404 : 200 };
}
