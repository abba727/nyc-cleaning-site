import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import App from "./App";
import { brandAssets } from "./content/assets";
import { company, getArticleImage, getArticleImageAlt, getLegacyByPath, getPageByPath, getPageImage, isBlogArchivePath, normalizePath, pages, siteOrigin } from "./content/site";
import { getArchiveSeo, getCanonicalRedirect, getLegacySeo, getPageSeo } from "./content/seo";
import { getPublishedArticleByPath } from "../../server/db";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
const ARTICLE_LOOKUP_TIMEOUT_MS = 2_000;
const INDEX_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const NOINDEX_ROBOTS = "noindex, follow";

async function getCmsArticleForRender(pathname: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getPublishedArticleByPath(pathname),
      new Promise<undefined>(resolve => {
        timeout = setTimeout(() => resolve(undefined), ARTICLE_LOOKUP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

const isAdminPath = (path: string) => path === "/admin/" || path.startsWith("/admin/");

export function isKnownPublicPath(url: string) {
  const path = normalizePath(url);
  return !getCanonicalRedirect(path) && Boolean(getPageByPath(path) || getLegacyByPath(path) || isBlogArchivePath(path));
}

export async function render(url: string) {
  const pathname = normalizePath(url);
  const adminRoute = isAdminPath(pathname);
  const redirectTarget = getCanonicalRedirect(pathname);
  const matchedPage = !redirectTarget && !adminRoute ? getPageByPath(pathname) : undefined;
  const matchedLegacy = !redirectTarget && !adminRoute ? getLegacyByPath(pathname) : undefined;
  const isSyntheticArchive = !redirectTarget && !adminRoute && isBlogArchivePath(pathname);
  const cmsArticle = !redirectTarget && !adminRoute && !matchedPage && !matchedLegacy && !isSyntheticArchive
    ? await getCmsArticleForRender(pathname)
    : undefined;
  const notFound = !adminRoute && !redirectTarget && !matchedPage && !matchedLegacy && !isSyntheticArchive && !cmsArticle;
  const fallbackPage = pages[0];
  const seo = adminRoute
    ? { path: pathname, title: "Owner Workspace | NYC Cleaning", description: "Secure NYC Cleaning and Maintenance owner workspace.", h1: "Owner Workspace", kind: "admin", indexable: false }
    : notFound
      ? { path: pathname, title: "Page Not Found | NYC Cleaning", description: "The requested NYC Cleaning and Maintenance page could not be found.", h1: "Page Not Found", kind: "missing", indexable: false }
      : cmsArticle
        ? { path: normalizePath(cmsArticle.path), title: cmsArticle.seoTitle || cmsArticle.title, description: cmsArticle.metaDescription || cmsArticle.excerpt || cmsArticle.description, h1: cmsArticle.title, kind: "article", indexable: true }
        : matchedLegacy
          ? getLegacySeo(matchedLegacy)
          : isSyntheticArchive
            ? getArchiveSeo(pathname)
            : getPageSeo(matchedPage || fallbackPage);

  const queryClient = new QueryClient();
  const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: `${siteOrigin}/api/trpc`, transformer: superjson })] });
  const html = renderToString(
    <React.StrictMode>
      <Router ssrPath={pathname}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}><App initialArticle={cmsArticle} initialNotFoundPath={notFound ? pathname : undefined} /></QueryClientProvider>
        </trpc.Provider>
      </Router>
    </React.StrictMode>
  );

  const canonical = `${siteOrigin}${normalizePath(seo.path)}`;
  const isArticle = Boolean(cmsArticle || matchedLegacy?.kind === "article");
  const image = cmsArticle?.coverImageUrl || (matchedLegacy?.kind === "article" ? getArticleImage(matchedLegacy) : matchedLegacy || isSyntheticArchive || notFound || adminRoute ? brandAssets.hero : getPageImage(matchedPage || fallbackPage));
  const imageUrl = image.startsWith("http") ? image : `${siteOrigin}${image}`;
  const imageAlt = cmsArticle?.coverImageAlt || (matchedLegacy?.kind === "article" ? getArticleImageAlt(matchedLegacy) : `${seo.h1} from ${company.name}`);
  const crumbs = [{ name: "Home", item: `${siteOrigin}/` }];
  if (isArticle) crumbs.push({ name: "Insights", item: `${siteOrigin}/category/blog/` });
  if (seo.path !== "/") crumbs.push({ name: seo.h1.replace(/\s*\|.*$/, ""), item: canonical });
  const datePublished = cmsArticle?.publishedAt?.toISOString() || matchedLegacy?.publishedAt || undefined;
  const dateModified = cmsArticle?.updatedAt?.toISOString() || datePublished;
  const pageSchema = isArticle
    ? {
        "@type": "Article",
        "@id": `${canonical}#article`,
        url: canonical,
        mainEntityOfPage: { "@id": `${canonical}#webpage` },
        headline: seo.h1,
        description: seo.description,
        image: { "@type": "ImageObject", url: imageUrl, caption: imageAlt },
        datePublished,
        dateModified,
        author: { "@id": `${siteOrigin}/#localbusiness` },
        publisher: { "@id": `${siteOrigin}/#localbusiness` },
        isPartOf: { "@id": `${siteOrigin}/#website` },
      }
    : {
        "@type": seo.kind === "archive" ? "CollectionPage" : "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: seo.title,
        description: seo.description,
        image: imageUrl,
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
        logo: { "@type": "ImageObject", url: `${siteOrigin}${brandAssets.logo}` },
        image: imageUrl,
        telephone: company.phoneDisplay,
        email: company.email,
        address: { "@type": "PostalAddress", streetAddress: "P.O. Box 660009", addressLocality: "Fresh Meadows", addressRegion: "NY", postalCode: "11366", addressCountry: "US" },
        areaServed: { "@type": "City", name: "New York City" },
      },
      { "@type": "WebSite", "@id": `${siteOrigin}/#website`, url: siteOrigin, name: company.name, publisher: { "@id": `${siteOrigin}/#localbusiness` } },
      ...(isArticle ? [{ "@type": "WebPage", "@id": `${canonical}#webpage`, url: canonical, name: seo.title, description: seo.description, isPartOf: { "@id": `${siteOrigin}/#website` } }] : []),
      pageSchema,
      { "@type": "BreadcrumbList", itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: crumb.item })) },
    ],
  };

  const head = [
    ...(cmsArticle ? [`<script>window.__INITIAL_ARTICLE__=${safeJson(cmsArticle)}</script>`] : []),
    ...(notFound ? [`<script>window.__INITIAL_NOT_FOUND_PATH__=${safeJson(pathname)}</script>`] : []),
    ...(pathname === "/" ? [`<link rel="preload" as="image" href="${brandAssets.heroResponsive.large}" imagesrcset="${brandAssets.heroResponsive.small} 960w, ${brandAssets.heroResponsive.large} 1440w" imagesizes="100vw" type="image/webp" fetchpriority="high" />`] : []),
    ...(pathname !== "/" && !adminRoute && !notFound && !isSyntheticArchive && matchedPage?.kind !== "legal" ? [`<link rel="preload" as="image" href="${escapeHtml(image)}" fetchpriority="high" />`] : []),
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="${seo.indexable ? INDEX_ROBOTS : NOINDEX_ROBOTS}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:type" content="${isArticle ? "article" : "website"}" />`,
    `<meta property="og:site_name" content="${escapeHtml(company.name)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
    ...(isArticle && datePublished ? [`<meta property="article:published_time" content="${escapeHtml(datePublished)}" />`] : []),
    ...(isArticle && dateModified ? [`<meta property="article:modified_time" content="${escapeHtml(dateModified)}" />`] : []),
    ...(seo.indexable ? [`<script type="application/ld+json">${safeJson(schema)}</script>`] : []),
  ].join("\n    ");
  return { html, head, status: adminRoute ? 200 : notFound ? 404 : 200 };
}
