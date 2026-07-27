# PageSpeed Insights baseline

## Source

- User-provided report: `/home/ubuntu/upload/PageSpeedInsights.pdf`
- Audited URL: `https://nyccleaning.co/`
- Report timestamp: Jul 26, 2026, 8:23:35 PM EDT
- Test profile: Mobile, emulated Moto G Power, Lighthouse 13.4.0, Slow 4G

## Reported measurements

| Metric | Reported value |
|---|---:|
| Performance score | 58 |
| First Contentful Paint | 4.1 s |
| Largest Contentful Paint | 75.2 s |
| Total Blocking Time | 240 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 5.5 s |

## Actionable findings in the report

| Finding | Evidence |
|---|---|
| Render-blocking stylesheet | `/assets/index-DlkdshGs.css`, 28.0 KiB, estimated 150 ms savings |
| Oversized homepage editorial image | `/media/generated/1784478509241_5aecb09f.png`, 1,914.3 KiB; source size 1264x841; displayed at 669x448; estimated 1,865.5 KiB savings through responsive sizing and modern formats |
| Oversized logo | `/media/nyc-cleaning-logo_aabc7372.webp`, 9.7 KiB; source 508x224; displayed at 214x94; estimated 8.0 KiB savings |
| Critical API payload | `article.listPublished` request was 1,075.91 KiB and extended the critical dependency tree to 1,941 ms |
| Unused JavaScript | Google Tag Manager resources totaled 614.5 KiB, with estimated 257.2 KiB unused; first-party JS was 162.6 KiB with estimated 50.4 KiB unused |
| Network payload | Total reported transfer size was 14,498 KiB |
| Additional diagnostics | Image elements missing explicit width/height; 6 long main-thread tasks; source maps missing for large first-party JS |

## Live-site checks performed during the audit

- Live homepage HTML at `https://www.nyccleaning.co/` references the oversized editorial image at `/media/generated/1784478509241_5aecb09f.png` along with many responsive variants for static site images.
- The CMS article card component marks the first three homepage article images as `loading="eager"` with high fetch priority.
- The public `article.listPublished` endpoint returns entire article rows; the database helper uses `select()` and therefore includes article body data rather than a compact card-specific payload.
- Fixed site media already uses AVIF/WebP variants through `/media/responsive-media/`; the CMS-generated editorial cover lacks an equivalent responsive variant path.
- The public page loads GTM container `GTM-NWNKHV2P`; this tracking infrastructure is intentional and must not be removed as part of performance work.
- A new PageSpeed API request could not be obtained because the anonymous quota was exceeded. The user-provided report is therefore the current external lab baseline.

## References

[1]: https://www.nyccleaning.co/ "NYC Cleaning homepage"
[2]: https://developers.google.com/speed/pagespeed/insights/ "Google PageSpeed Insights"


## Implemented first-party optimization set

- Reduced `article.listPublished` to card-only fields so homepage and archive cards no longer transfer full article-body content.
- Reused compact server-rendered homepage insight cards on hydration; the browser avoids the redundant article-list request when SSR supplies initial data.
- Changed homepage and archive editorial cards to lazy, low-priority image loading and reserved image layout space.
- Added responsive AVIF/WebP source sets for existing and future CMS editorial cover images, including a deployment-time backfill for existing covers.
- Added an immutable responsive-variant generator to the CMS cover-upload and generated-cover flows.
- Added right-sized AVIF/WebP variants for the public header and footer logo, preserving intrinsic image dimensions.

## Validation to date

- Production build succeeded after the changes.
- Type checking completed successfully.
- Full integration test suite passed: 34 test files and 188 tests. The initial test invocation lacked the normal CI-only JWT test variable; rerunning with the production-pipeline test configuration passed without test failures.

