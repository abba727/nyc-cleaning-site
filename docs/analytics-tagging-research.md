# Google Analytics and Tag Manager integration notes

## Official guidance

Google describes Google Tag Manager (GTM) as the preferred way to manage Google Analytics and other tags without repeatedly editing site code. Google also states that when GTM is used, a separate `gtag.js` snippet should not be added to the same site, because the Google tag can instead be configured inside the GTM container.

Accordingly, the website implementation should use one mutually exclusive installation path:

| CMS setting state | Public-site behavior |
|---|---|
| GTM container ID is present | Emit the GTM head bootstrap and its noscript iframe; the site owner configures the GA4 Google tag inside GTM. |
| No GTM container ID but a GA4 measurement ID is present | Emit the direct GA4 `gtag.js` bootstrap. |
| Neither ID is present | Emit no analytics tag. |

The relevant identifier formats are a GA4 measurement ID beginning with `G-` and a GTM container ID beginning with `GTM-`.

## Sources

1. Google Analytics Developers, [Tagging for Google Analytics](https://developers.google.com/analytics/devguides/collection/ga4/tag-options): recommends GTM and states that separate `gtag.js` snippets are unnecessary when GTM is used.
2. Google Tag Manager Help, [Set up Google Analytics in Tag Manager](https://support.google.com/tagmanager/answer/9442095?hl=en): describes creating a Google tag in a GTM container and publishing it.
3. Google Tag Platform, [Introduction to tagging and the Google tag](https://developers.google.com/tag-platform/devguides): describes GTM’s two on-page snippets and gtag.js as the direct-code alternative.
