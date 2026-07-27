# PageSpeed Regression Investigation

## User-provided report

Source file: `/home/ubuntu/upload/PageSpeedInsights.pdf`

The report was captured on July 26, 2026 at 8:23:35 PM for `https://nyccleaning.co/`. It reports a mobile performance score of 58, FCP 4.1 s, LCP 75.2 s, TBT 240 ms, CLS 0, and Speed Index 5.5 s.

The report identifies the following pre-optimization issues:

| Finding | Historical evidence |
|---|---|
| Oversized editorial cover | `/media/generated/1784478_5aecb09f.png`, 1,914.3 KiB, rendered at a smaller size, eager/high-priority. |
| Oversized logo | Original 508×224 WebP rendered smaller. |
| Large article API request | `/trpc/article.listPublished` returned 1,075.91 KiB on the critical dependency chain. |
| Render-blocking CSS | `/assets/index-DlkdshGs.css`, with an estimated 150 ms saving. |
| Third-party tag overhead | GTM container plus two GA4 tags and a Google Ads tag; 614.5 KiB transferred and an estimated 257.2 KiB unused. |
| Total payload | 14,498 KiB. |

## Live comparison after production commit `6541754`

A direct live-source check showed the user-provided report predates the deployed optimization:

| Check | Current live result |
|---|---|
| Application bundle | `assets/index-CiCHhsJf.js`, not historical `index-C0j5SU4r.js`. |
| Historical large cover | Absent from current initial homepage HTML. |
| Initial article API request | Absent from current initial homepage HTML. |
| Responsive logo markup | Present in current initial homepage HTML. |

A fresh PageSpeed Insights browser report previously captured after the deployment showed a score of 55, FCP 4.2 s, LCP 7.9 s, TBT 300 ms, CLS 0, and Speed Index 6.5 s. That report passed image delivery and identified the remaining primary cost as the GTM workspace loading the current GA4 tag, an older GA4 tag, a Google Ads tag, and related collection requests.

## Investigation implication

The attached PDF accurately describes severe historical first-party bottlenecks but does not reflect the deployed bundle and image/request-chain fixes. The next investigation stage should trace the current 55-score report, with focus on render-blocking shared CSS, first-party bundle work, and the duplicate/ads tags in GTM. Any tracking-load deferral must retain reliable attribution and form-conversion measurement.

## Fresh current assessment

A new mobile PageSpeed Insights run was initiated at July 27, 2026, 1:36:35 AM using the current canonical URL `https://www.nyccleaning.co/`. The run identifier is `be4kanm9rt`; diagnostics were still loading at the first follow-up view.

## Fresh assessment result

The completed current mobile PageSpeed run at 1:36 AM reports a performance score of 61, FCP approximately 4.0 s, LCP 7.8 s, TBT 120 ms, CLS 0, and Speed Index 6.6 s. The active audit list is now limited to render-blocking requests (estimated 150 ms), unused JavaScript (estimated 317 KiB), four long main-thread tasks, the LCP breakdown/request-discovery panels, and cache lifetime guidance. Image delivery no longer appears as an active audit.

The report detects the GTM container (`GTM-NWNKHV2P`) and at least three Google identifiers: `G-CRL72YMMGH`, `G-3Y54FY9VZY`, and `AW-17779982962`.


## Detailed live Lighthouse evidence

A reproducible mobile Lighthouse audit against the current production homepage found that FCP and LCP were 3.7 seconds in that run. The LCP element was the homepage hero image (`main > section.home-hero > picture.responsive-picture > img.hero-bg`). Its breakdown was: TTFB 2,040.9 ms; resource-load delay 42.4 ms; resource-load duration 1,296.2 ms; and element-render delay 311.3 ms. The hero AVIF was correctly preloaded and transferred 15.6 KB, so document delivery/TTFB—not late hero discovery—is the dominant remaining first-party LCP factor.

Repeated live homepage curl samples measured TTFB from 1.98 to 2.16 seconds. The public HTML response currently has `Cache-Control: no-cache`, preventing edge reuse of safe, public SSR documents. The main first-party JavaScript transferred 166.0 KB (630.9 KB uncompressed), with Lighthouse estimating 61.9 KB unused during initial homepage execution.

The same audit observed the GTM container loading Google Ads (`AW-17779982962`) plus two GA4 tags (`G-3Y54FY9VZY` and `G-CRL72YMMGH`). Lighthouse attributed long main-thread tasks of 394.5 ms, 350.7 ms, and 296.3 ms to those third-party resources. The only reported first-party render-blocking CSS opportunity was the shared 22.5 KB stylesheet, estimated at 150 ms; no unsafe asynchronous stylesheet change has been applied.

Source report: `https://pagespeed.web.dev/analysis/https-www-nyccleaning-co/be4kanm9rt?form_factor=mobile`.
