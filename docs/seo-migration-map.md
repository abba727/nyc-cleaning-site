# NYC Cleaning SEO Migration Map

This migration keeps the established `https://www.nyccleaning.co` URL structure as the canonical public surface. The replacement application renders each preserved route with server-side HTML, route-specific metadata, structured data, and internal links. Convenience aliases resolve to the same content but declare the established legacy URL as canonical.

## Core route decisions

| Requested route | Canonical route | Launch behavior | Rationale |
| --- | --- | --- | --- |
| `/` | `/` | Preserve | Primary business landing page. |
| `/services/` | `/cleaning-service-nyc/` | Serve canonical content with canonical tag pointing to `/cleaning-service-nyc/` | Supports an intuitive destination without creating a second indexable service archive. |
| `/cleaning-service-nyc/` | `/cleaning-service-nyc/` | Preserve | Established service overview URL. |
| `/commercial-cleaning-nyc/` | `/services/commercial-cleaning-nyc/` | Serve canonical content with canonical tag pointing to the nested service URL | Supports an expected top-level URL while consolidating search signals. |
| `/about/` | `/about-us/` | Serve canonical content with canonical tag pointing to `/about-us/` | Convenience alias for visitors and legacy links. |
| `/about-us/` | `/about-us/` | Preserve | Established company page URL. |
| `/who-we-are/` | `/who-we-are/` | Preserve | Existing indexable company route. |
| `/service-area/` | `/we-serve-new-york/` | Serve canonical content with canonical tag pointing to `/we-serve-new-york/` | Convenience alias with one canonical service-area page. |
| `/we-serve-new-york/` | `/we-serve-new-york/` | Preserve | Established service-area URL. |
| `/careers/` | `/careers-and-opportunities/` | Serve canonical content with canonical tag pointing to `/careers-and-opportunities/` | Convenience alias with one canonical careers page. |
| `/careers-and-opportunities/` | `/careers-and-opportunities/` | Preserve | Established careers URL. |
| `/contact/` | `/contact/` | Preserve | Primary lead-generation route. |
| `/blog/` | `/category/blog/` | Serve the curated Insights archive with canonical tag pointing to `/category/blog/` | Keeps a human-friendly alias while preserving the established archive URL. |
| `/category/blog/` | `/category/blog/` | Preserve | Existing blog archive URL. |
| `/privacy-policy/` | `/service-guru-app-privacy-policy/` | Serve canonical content with canonical tag pointing to the legacy policy route | Convenience alias without splitting legal-page signals. |
| `/service-guru-app-privacy-policy/` | `/service-guru-app-privacy-policy/` | Preserve | Existing indexed privacy-policy route. |

## Service and article routes

Every audited `/services/.../` path is preserved as its own server-rendered service page. Every audited legacy article slug is also preserved as a crawler-visible static article route with its original title, description, body content, and canonical URL. The definitive inventory is maintained in `docs/content-parity-matrix.md` and the typed route data under `client/src/content/`.

WordPress implementation endpoints are not public content and are excluded from the replacement sitemap. This includes upload URLs, feeds, author archives, REST/API endpoints, and query-string utility variants. No visitor-facing page is redirected to a generic homepage.

## Launch redirect policy

The application currently serves convenience aliases with canonical consolidation so they remain useful in preview and do not create duplicate indexable documents. At domain cutover, the hosting edge should issue HTTP `301` redirects from each alias in the table to its canonical route. Preserved canonical routes should return `200`; removed WordPress implementation endpoints should return `404` or `410` rather than redirecting indiscriminately.

Before launch, crawl the staging deployment and verify that every sitemap URL returns `200`, every alias returns the intended permanent redirect at the production edge, all canonical tags use HTTPS and the `www` host, and no redirect chain contains more than one hop.
