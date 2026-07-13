# Article Image Audit

**Audit date:** 2026-07-13

The redesigned Insights library contains **95 preserved article routes** and **95 distinct cover-image URLs** in `client/src/content/article-images.json`. Every entry includes descriptive alt text and is used by archive cards, article detail heroes, Open Graph metadata, Twitter metadata, and Article structured data.

The HTTP audit followed each project-storage redirect and confirmed **95 of 95 URLs returned `200` with an `image/*` MIME type**. The six covers regenerated after filename-only batch results were also confirmed as completed 2304 × 1536 PNG files with distinct cryptographic hashes and file sizes between 4.0 MB and 5.3 MB; they are not pending or failed placeholder files.

The separately requested corrected editorial image, `nyc-cleaning-editorial-corrected.png`, was visually reviewed as a finished photorealistic New York property-cleaning scene with two uniformed professionals, realistic equipment, no visible branding, and no text artifacts. The regenerated full-service janitorial staffing cover was also visually reviewed as a finished five-person facilities-team briefing image rather than a status placeholder.

The raw URL audit is retained at `/home/ubuntu/webdev-static-assets/article-image-audit.tsv` for release validation.
