# NYC Cleaning Redesign Implementation Blueprint

## Design direction

The visual system will be called **Metropolitan Clean**. It combines the redesign package’s editorial hierarchy with the existing logo’s blue-and-green identity. The result should feel like an experienced New York building-services operator rather than a generic residential cleaning template.

| Design token | Value | Purpose |
| --- | --- | --- |
| Midnight | `#0B1F33` | Primary navigation, footer, dark section fields, and high-emphasis type. |
| Borough Blue | `#155E93` | Links, service labels, focus states, and secondary calls to action. |
| Brand Green | `#63B945` | Primary conversion accents, active states, and compact trust indicators. |
| Signal Lime | `#C8E56B` | Sparse decorative highlights and micro-details, never long-form text. |
| Warm White | `#FAFBF8` | Main canvas. |
| Stone | `#EEF1EC` | Alternating section backgrounds and cards. |
| Graphite | `#1B2530` | Primary body copy. |
| Muted Slate | `#5D6A74` | Supporting copy and metadata. |

Headings will use **Archivo** at 600–800 weight, while body copy and controls will use **Source Sans 3** at 400–700 weight. Components will use restrained two-pixel radii, fine borders, and directional shadows rather than soft, generic pill-shaped cards. The hero will use an asymmetric split composition, editorial type, a full-bleed photographic panel, and compact proof points. Motion will be limited to sub-300 ms transform/opacity transitions and disabled under reduced-motion preferences.

## Responsive layout system

| Viewport | Behavior |
| --- | --- |
| Below 640 px | Single-column content, 20 px page gutters, 44 px minimum targets, full-width primary calls to action, stacked form fields, and a modal mobile menu. |
| 640–899 px | Two-column service grids where space allows, 28 px gutters, and condensed proof/trust layouts. |
| 900–1199 px | Desktop navigation appears, hero becomes a 5/7 split, and service grids use two or three columns according to density. |
| 1200 px and above | Maximum content width of 1,240 px, 40 px gutters, three-column services, and two-column long-form service templates. |

## Public route architecture

All established routes will be preserved exactly. Routes not present in the replacement sitemap will not be removed without a documented redirect.

| Route group | Preserved routes |
| --- | --- |
| Core | `/`, `/cleaning-service-nyc/`, `/about-us/`, `/who-we-are/`, `/we-serve-new-york/`, `/careers-and-opportunities/`, `/contact/` |
| Blog index | `/category/blog/` |
| Legal | `/service-guru-app-privacy-policy/` |
| Services | All 23 existing `/services/.../` paths recorded in `docs/audit-notes.md` and `docs/source-audit/live-pages.json`. |
| Blog articles | Every current post slug from the source sitemap will be retained in the SEO migration inventory for the CMS phase. The public phase will expose a source-aware blog index and preserve article-route handling rather than silently dropping indexed URLs. |

## Content model

The frontend will render route data from typed content objects rather than duplicating page markup. A long-form service page will consist of a title, eyebrow, summary, hero image, primary narrative blocks, optional benefits, related services, calls to action, and page-specific SEO metadata. Exact source copy captured in the audit remains the content authority; the redesign prototype supplies hierarchy and presentation where it does not conflict with live content.

| Content entity | Required fields |
| --- | --- |
| Site settings | Business name, phone, email, verified mailing address, service area, logo URL, social URLs, default SEO image, and canonical base URL. |
| Service page | Slug, preserved path, title, hero line, source copy, image key, related services, title tag, description, and breadcrumb label. |
| Core page | Preserved path, title, page sections, calls to action, title tag, description, and structured-data eligibility. |
| Blog preview | Source URL, title, publication date, excerpt, and image. No invented author, review, or engagement data. |

## Inquiry data model

The owner explicitly requested database persistence for contact and quote submissions. A new `inquiries` table will therefore be added through the schema-first migration workflow.

| Column | Type and rule |
| --- | --- |
| `id` | Auto-incrementing integer primary key. |
| `name` | Required string, maximum 120 characters. |
| `email` | Required normalized email, maximum 320 characters. |
| `phone` | Optional string, maximum 32 characters. |
| `serviceType` | Required string selected from the public service options, maximum 120 characters. |
| `message` | Required text, constrained in API validation. |
| `sourcePath` | Required string identifying the page where the form was submitted. |
| `status` | Enum: `new`, `contacted`, or `closed`; defaults to `new`. |
| `notificationStatus` | Enum: `pending`, `sent`, or `failed`; defaults to `pending`. |
| `createdAt` | UTC timestamp with a database default. |
| `updatedAt` | UTC timestamp updated on change. |

Submission ordering is deliberate: validate and normalize input, persist the inquiry, attempt the owner notification, update notification status, then return a clear success response. A notification failure must not delete or roll back a successfully stored lead.

## SEO rendering and migration rules

The public site will use server-side rendering so route-specific content, titles, descriptions, canonical tags, Open Graph tags, and JSON-LD are present in the initial HTML response. The implementation will keep the managed server and tRPC API while rendering public routes on the server.

| Requirement | Implementation rule |
| --- | --- |
| Titles and descriptions | Unique, route-specific values derived from current metadata and page intent; never reused across the service catalog. |
| Canonical URLs | Absolute `https://www.nyccleaning.co/...` values with the established trailing-slash convention. |
| Open Graph | Route title, description, canonical URL, site name, type, and a real branded page image. |
| Structured data | A verified LocalBusiness entity site-wide; WebSite and WebPage on public pages; BreadcrumbList on nested pages; service markup only where content supports it. |
| NAP | Visible footer, contact page, and LocalBusiness schema must use one verified address. Until the source conflict is resolved, the visible P.O. Box will be retained and no conflicting street address will be asserted in schema. |
| Sitemap | Core, legal, service, blog-index, and preserved article URLs, using HTTPS and intended indexability. |
| Robots | Permit public crawling, point to the HTTPS sitemap, and disallow only non-public API/auth/admin surfaces. |
| Redirects | Existing paths are preserved. Any later canonical slug consolidation must use server-side permanent redirects and be documented. |

## Image production manifest

No generated image will contain text, logos, ratings, badges, or deceptive certification marks. People will be presented naturally and inclusively, with recognizable New York architectural context that does not imply a specific client relationship.

| Image key | Brief |
| --- | --- |
| `hero` | Professional NYC building lobby transitioning to a streetscape, daytime, cleaning team at work, navy/green tonal grade, generous negative space for copy. |
| `about-team` | Experienced commercial cleaning and maintenance team in a bright property lobby, candid and trustworthy rather than posed. |
| `porter` | Uniformed porter maintaining an upscale residential common area. |
| `building-maintenance` | Maintenance technician inspecting clean building systems with a tablet and tools. |
| `doorman` | Professional doorman welcoming a resident at a New York apartment entrance. |
| `janitorial` | Commercial janitorial team cleaning a modern office corridor. |
| `garbage-bin` | Hygienic garbage-bin cleaning in a controlled New York service alley. |
| `common-area` | Immaculate lobby and hallway maintenance with an active staff member. |
| `sweeping-trash` | Sidewalk sweeping and organized trash handling on a recognizable New York block. |
| `commercial-cleaning` | Team cleaning a modern office or mixed-use commercial interior. |
| `office-cleaning` | Detailed desk and shared-space cleaning after business hours. |
| `deep-cleaning` | Close, professional deep-cleaning work with commercial equipment. |
| `house-cleaning` | Clean, lived-in New York townhouse interior with a professional cleaner. |
| `apartment-cleaning` | Compact, polished New York apartment kitchen and living area being cleaned. |
| `property-cleaning` | Exterior and grounds care around a New York residential property. |
| `property-maintenance` | Preventive inspection of a mixed-use building’s common systems. |
| `repair` | Technician completing a small, professional interior repair with organized tools. |
| `maintenance-management` | Building manager reviewing an inspection plan on a tablet in a lobby. |
| `staffing` | Uniformed maintenance and janitorial professionals in a realistic team briefing. |
| `pricing` | Property manager and service lead reviewing a transparent scope of work at a clean desk. |
| `careers` | Diverse cleaning and maintenance team in a candid pre-shift huddle. |
| `nyc-service-area` | Clean New York streetscape spanning residential and commercial architecture, no landmark trademark emphasis. |
| `contact` | Detail of a clean, welcoming building reception area with natural light. |

## Reviews implementation decision

The existing site contains testimonial quotations, and the redesign package repeats them. The replacement will not fabricate, seed, mock, or hardcode customer reviews. The initial production section will direct visitors to a verified review source and reserve a compliant dynamic review surface. Exact quotes and star ratings will only be rendered after an authorized, verifiable review feed is connected.
