#!/usr/bin/env python3
"""Generate crawler directives and the canonical public URL sitemap."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from urllib.parse import urljoin


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "client" / "public"
SITE_ORIGIN = "https://www.nyccleaning.co"


def normalize(path: str) -> str:
    path = "/" + path.strip("/")
    return "/" if path == "/" else f"{path}/"


def main() -> None:
    site_data = json.loads((ROOT / "client" / "src" / "content" / "site-data.json").read_text())
    legacy_data = json.loads((ROOT / "client" / "src" / "content" / "legacy-articles.json").read_text())

    paths = {normalize(page["path"]) for page in site_data["pages"]}
    paths.update(normalize(item["path"]) for item in legacy_data)
    paths.update({"/category/blog/", "/category/cleaning-services/", "/category/uncategorized/"})

    blocked_markers = ("/wp-admin/", "/wp-json/", "/feed/", "/author/", "/wp-content/")
    clean_paths = sorted(
        path for path in paths
        if not any(marker in path for marker in blocked_markers)
        and "?" not in path
    )

    lastmod = date.today().isoformat()
    url_entries = []
    for path in clean_paths:
        priority = "1.0" if path == "/" else "0.8" if path in {"/cleaning-service-nyc/", "/contact/", "/about-us/"} else "0.6"
        url_entries.append(
            "  <url>\n"
            f"    <loc>{urljoin(SITE_ORIGIN, path.lstrip('/'))}</loc>\n"
            f"    <lastmod>{lastmod}</lastmod>\n"
            f"    <changefreq>{'weekly' if path in {'/', '/category/blog/'} else 'monthly'}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            "  </url>"
        )

    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(url_entries)
        + "\n</urlset>\n"
    )
    robots = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        "Disallow: /wp-admin/\n"
        "Disallow: /wp-json/\n\n"
        f"Sitemap: {SITE_ORIGIN}/sitemap.xml\n"
    )

    PUBLIC.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "sitemap.xml").write_text(sitemap)
    (PUBLIC / "robots.txt").write_text(robots)
    print(json.dumps({"sitemap_urls": len(clean_paths), "robots": str(PUBLIC / "robots.txt")}, indent=2))


if __name__ == "__main__":
    main()
