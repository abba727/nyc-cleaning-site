# Quote overlay, thank-you flow, and tracking settings design

## Public conversion flow

The public app will receive a `QuoteFormOverlayProvider` around its shared public shell. The provider will expose a small `QuoteCta` trigger component through context, allowing every quote-oriented CTA to open one accessible dialog instead of navigating to `/contact/`. The provider will record the current route when the dialog opens so inquiry records preserve their originating page.

| Area | Change |
|---|---|
| Shared header and footer | Replace quote-page links with quote-overlay triggers. |
| Home, service, and interior heroes | Replace `Get a Free Quote` and `Request a Quote` links with triggers. |
| Service walkthrough cards | Replace `Request a Walkthrough` links with triggers. |
| Insights/archive content | Replace quote-oriented links with triggers. |
| Existing contact page | Retain its full embedded inquiry form. |
| Dialog completion | Reuse the existing public inquiry API and navigate to `/thank-you/` only after a successful submission. |

The overlay will reuse `InquiryForm` with a success callback. The callback will navigate to `/thank-you/` after the inquiry API confirms success, rather than displaying the inline form-success state inside the dialog. The dedicated thank-you page will remain inside the existing public header/footer shell and will be handled as a known SSR route with a 200 response and purpose-built title/description.

## Map refinement

The service-area map will retain its fit-to-active-locations approach while reducing both Google Maps and Leaflet fit-bounds padding slightly further. This increases the opening zoom without hiding any active coverage points.

## Analytics and Tag Manager settings

A one-row `siteSettings` record will hold optional public tag identifiers. The CMS screen will be available only to administrators because changing tags changes third-party code loaded across the public site.

| Setting | Validation | Public behavior |
|---|---|---|
| GA4 measurement ID | `G-` followed by uppercase letters, digits, or hyphens | Emits a direct GA4 `gtag.js` bootstrap only when GTM is blank. |
| GTM container ID | `GTM-` followed by uppercase letters, digits, or hyphens | Emits a GTM head bootstrap plus the GTM noscript iframe. It takes precedence over direct GA4 to avoid duplicate collection. |

The server renderer will retrieve the settings for public requests only. It will place the GA4/GTM head code through the existing SSR head output and place the GTM noscript markup immediately after the opening body tag through a new template placeholder. Admin CMS pages will not receive public tracking tags.

## Database and API

The schema will add a single-row `siteSettings` table with an explicit primary key, nullable GA4/GTM IDs, and timestamps. Database helpers will provide a safe default when no row exists and an idempotent upsert. A new `settings` tRPC router will provide an administrator-protected `get` query and `update` mutation.
