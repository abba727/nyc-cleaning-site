# NYC Cleaning Final QA Validation

Final quality assurance combines visual review of every distinct public template with deterministic checks across every canonical public URL and every centralized branded asset. This approach verifies responsive composition once per shared template while independently proving that all data-driven service, archive, and legacy-article routes render complete crawler-visible documents.

## Responsive visual coverage

| Template or flow | Desktop validation | Mobile validation | Verified behavior |
| --- | --- | --- | --- |
| Homepage | `/` | `/` | Sticky navigation, branded logo, hero image, readable type hierarchy, service discovery, calls to action, and section spacing. |
| Service catalog | `/cleaning-service-nyc/` | `/cleaning-service-nyc/` | Responsive card grid, complete service links, generated image cropping, and CTA visibility. |
| Service detail | `/services/commercial-cleaning-nyc/` and `/commercial-cleaning-nyc/` | `/services/commercial-cleaning-nyc/` | Canonical and alias route resolution, hero imagery, long-form readability, related services, and conversion panel. All 23 service pages use this shared validated template. |
| Insights archive | `/category/blog/` | `/category/blog/` | Curated archive grouping, readable month labels, manageable discovery density, and responsive article cards. |
| Preserved legacy article | Representative audited article route | Representative audited article route | Shared article template, breadcrumbs, metadata, body rhythm, internal navigation, and mobile reading width. |
| Contact conversion | `/contact/` | `/contact/` | Complete NAP, labeled form controls, stacked mobile fields, visible submit action, success/error surfaces, and keyboard focus treatment. |
| Company and legal | `/about-us/` and `/service-guru-app-privacy-policy/` | `/about-us/` and `/privacy-policy/` | Core-route resolution, text contrast, responsive content width, and canonical alias handling. |

Desktop captures used a 1,440 × 1,000 viewport. Mobile captures used a 390 × 844 viewport. Runtime telemetry was reviewed after both passes; no current client exception, failed image request, or server-rendering error was present.

## Complete canonical route audit

The final canonical sitemap contains **149 URLs**. Every URL was requested through the running application and checked for all of the following:

| Requirement | Final result |
| --- | --- |
| HTTP response | 149 of 149 returned `200`. |
| Content type | 149 of 149 returned `text/html`. |
| Initial server-rendered title | 149 of 149 present. |
| Absolute `https://www.nyccleaning.co` canonical link | 149 of 149 present. |
| Initial server-rendered primary heading | 149 of 149 present. |

The row-level evidence is stored in `docs/public-route-audit.tsv`. It covers all core pages, all 23 service URLs, all preserved legacy article URLs, archive routes, and the legal route. Convenience aliases are tested separately in the Vitest SEO suite and intentionally excluded from the canonical sitemap.

## Complete production-asset audit

All **24** entries in `client/src/content/assets.ts`—the existing logo plus every generated site image—were requested through the application storage proxy with redirects followed to the final delivery object. Each returned HTTP `200`, a non-empty body, and an `image/*` content type. The row-level status, content type, byte size, and delivery URL are stored in `docs/asset-audit.txt`.

No placeholder-image provider, temporary image label, pending asset reference, or stock-photo fallback pattern remains in the implemented client source. Route-to-image assignments are documented in `docs/image-coverage-map.md`.

## Automated and data checks

Vitest passes **14 tests across four suites**, including SSR metadata, canonical aliases, sitemap rules, inquiry validation, persistence behavior, owner-notification payloads, and notification-failure handling. TypeScript validation and the production Vite/server bundle build also pass. The live database schema was inspected and contains the complete `inquiries` table with contact, service, status, notification-status, source-path, and UTC timestamp fields.
