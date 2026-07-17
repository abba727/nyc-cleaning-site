#!/usr/bin/env python3
"""Generate static crawler fallbacks; the deployed server enriches sitemap.xml with published CMS Insights."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urljoin


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "client" / "public"
SITE_ORIGIN = "https://www.nyccleaning.co"
ALIASES = {
    "/services/",
    "/about/",
    "/privacy-policy/",
    "/commercial-cleaning-nyc/",
    "/blog/",
    "/category/cleaning-services/",
    "/category/uncategorized/",
}


def normalize(path: str) -> str:
    path = "/" + path.strip("/")
    return "/" if path == "/" else f"{path}/"


def main() -> None:
    site_data = json.loads((ROOT / "client" / "src" / "content" / "site-data.json").read_text())
    legacy_data = json.loads((ROOT / "client" / "src" / "content" / "legacy-articles.json").read_text())
    page_paths = {normalize(page["path"]) for page in site_data["pages"] if page.get("kind") != "legal"}
    legacy_paths = {normalize(item["path"]) for item in legacy_data}
    legacy_dates = {normalize(item["path"]): item.get("publishedAt", "")[:10] for item in legacy_data}
    paths = page_paths | legacy_paths | {"/category/blog/"}

    blocked_markers = ("/wp-admin/", "/wp-json/", "/feed/", "/author/", "/wp-content/")
    clean_paths = sorted(
        path for path in paths
        if path not in ALIASES
        and not any(marker in path for marker in blocked_markers)
        and "?" not in path
    )

    url_entries = []
    for path in clean_paths:
        lines = ["  <url>", f"    <loc>{urljoin(SITE_ORIGIN, path.lstrip('/'))}</loc>"]
        if legacy_dates.get(path):
            lines.append(f"    <lastmod>{legacy_dates[path]}</lastmod>")
        lines.append("  </url>")
        url_entries.append("\n".join(lines))

    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(url_entries)
        + "\n</urlset>\n"
    )
    robots = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin/\n"
        "Disallow: /api/\n"
        "Disallow: /oauth/\n\n"
        f"Sitemap: {SITE_ORIGIN}/sitemap.xml\n"
    )

    PUBLIC.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "sitemap.xml").write_text(sitemap)
    (PUBLIC / "robots.txt").write_text(robots)
    print(json.dumps({"sitemap_urls": len(clean_paths), "robots": str(PUBLIC / "robots.txt")}, indent=2))


if __name__ == "__main__":
    main()
