import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import App from "./App";
import { brandAssets } from "./content/assets";
import { blogArchivePaths, company, getLegacyByPath, getPageByPath, getPageImage, isBlogArchivePath, legacyContent, normalizePath, pages, siteOrigin } from "./content/site";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export function isKnownPublicPath(url: string) {
  return Boolean(getPageByPath(url) || getLegacyByPath(url) || isBlogArchivePath(url));
}

export function render(url: string) {
  const pathname = normalizePath(url);
  const matchedPage = getPageByPath(pathname);
  const matchedLegacy = getLegacyByPath(pathname);
  const isSyntheticArchive = isBlogArchivePath(pathname);
  const page = matchedPage || pages[0];
  const seo = matchedLegacy ? { path: matchedLegacy.path, title: matchedLegacy.title, description: matchedLegacy.description, h1: matchedLegacy.title, kind: matchedLegacy.kind === "article" ? "blog" : "core" } : isSyntheticArchive ? { path: pathname, title: "Cleaning Insights | NYC Cleaning and Maintenance", description: "Practical cleaning and property-maintenance guidance from NYC Cleaning and Maintenance.", h1: "Cleaning and Property Maintenance Insights", kind: "core" } : page;
  const queryClient = new QueryClient();
  const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: `${siteOrigin}/api/trpc`, transformer: superjson })] });
  const html = renderToString(
    <React.StrictMode>
      <Router ssrPath={pathname}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
        </trpc.Provider>
      </Router>
    </React.StrictMode>
  );

  const canonical = `${siteOrigin}${normalizePath(seo.path)}`;
  const image = matchedLegacy || isSyntheticArchive ? brandAssets.hero : getPageImage(page);
  const crumbs = [{ name: "Home", item: `${siteOrigin}/` }];
  if (seo.path !== "/") crumbs.push({ name: seo.h1.replace(/\s*\|.*$/, ""), item: canonical });
  const pageSchema = { "@type": matchedLegacy?.kind === "article" ? "Article" : "WebPage", "@id": `${canonical}#webpage`, url: canonical, name: seo.title, headline: matchedLegacy?.kind === "article" ? seo.h1 : undefined, datePublished: matchedLegacy?.publishedAt || undefined, description: seo.description, isPartOf: { "@id": `${siteOrigin}/#website` } };
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

  const head = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:type" content="${matchedLegacy?.kind === "article" || seo.kind === "blog" ? "article" : "website"}" />`,
    `<meta property="og:site_name" content="${escapeHtml(company.name)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${siteOrigin}${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${siteOrigin}${image}" />`,
    `<script type="application/ld+json">${safeJson(schema)}</script>`,
  ].join("\n    ");
  return { html, head, status: isKnownPublicPath(pathname) ? 200 : 404 };
}
