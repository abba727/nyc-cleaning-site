from __future__ import annotations

import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "docs/source-audit/live-link-media-inventory.json"
SITE_DATA = ROOT / "client/src/content/site-data.json"
OUTPUT_JSON = ROOT / "client/src/content/legacy-articles.json"
OUTPUT_MD = ROOT / "docs/source-audit/legacy-article-inventory.md"

ORIGIN = "https://www.nyccleaning.co"
SKIP_PREFIXES = (
    "/wp-content/",
    "/wp-json/",
    "/wp-admin/",
    "/author/",
    "/tag/",
    "/feed/",
)
SKIP_SUFFIXES = ("/feed/", "/comments/feed/")
CONTENT_SELECTORS = (
    ".col-md-8 > .content",
    ".col-md-8 .content",
    "article .elementor-widget-theme-post-content",
    "article .entry-content",
    "main article",
    ".elementor-location-single",
    ".site-main",
    "main",
)


def normalize_path(url: str) -> str | None:
    parsed = urlparse(url)
    host = parsed.netloc.lower().removeprefix("www.")
    if host != "nyccleaning.co" or parsed.query or parsed.fragment:
        return None
    path = re.sub(r"/+", "/", parsed.path or "/")
    if path != "/" and not path.endswith("/"):
        path += "/"
    if path.startswith(SKIP_PREFIXES) or path.endswith(SKIP_SUFFIXES):
        return None
    if path in {"/xmlrpc.php/", "/favicon.ico/"}:
        return None
    return path


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def extract_blocks(container: BeautifulSoup) -> list[dict[str, str]]:
    blocks: list[dict[str, str]] = []
    seen: set[str] = set()
    for node in container.select("h2, h3, p, li"):
        text = clean_text(node.get_text(" ", strip=True))
        if len(text) < 2 or text in seen:
            continue
        seen.add(text)
        blocks.append({"type": node.name, "text": text})
    return blocks


def extract_article(path: str, session: requests.Session) -> dict | None:
    url = f"{ORIGIN}{path}"
    try:
        response = session.get(url, timeout=20, allow_redirects=True)
        if response.status_code != 200:
            return None
    except requests.RequestException:
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    container = None
    for selector in CONTENT_SELECTORS:
        candidate = soup.select_one(selector)
        if candidate and len(clean_text(candidate.get_text(" ", strip=True))) > 220:
            container = candidate
            break
    if container is None:
        container = soup.body
    if container is None:
        return None

    for unwanted in container.select(
        "header, nav, footer, form, script, style, noscript, svg, .menu, .elementor-location-header, .elementor-location-footer"
    ):
        unwanted.decompose()

    blocks = extract_blocks(container)
    body_words = sum(len(block["text"].split()) for block in blocks)
    if body_words < 80:
        return None

    h1 = soup.find("h1")
    if h1:
        title = clean_text(h1.get_text(" ", strip=True))
    elif soup.title:
        title = clean_text(soup.title.get_text(" ", strip=True))
        title = re.split(r"\s+[|–—-]\s+NYC Cleaning", title, maxsplit=1)[0].strip()
    else:
        return None
    meta = soup.select_one('meta[name="description"]')
    description = clean_text(meta.get("content", "")) if meta else ""
    date_node = soup.select_one('meta[property="article:published_time"], time[datetime]')
    date_value = ""
    if date_node:
        date_value = clean_text(date_node.get("content") or date_node.get("datetime") or "")

    return {
        "path": path,
        "kind": "archive" if re.fullmatch(r"/\d{4}/\d{2}/", path) else "article",
        "title": title,
        "description": description or f"Read {title} from NYC Cleaning & Maintenance.",
        "publishedAt": date_value,
        "blocks": blocks,
        "sourceUrl": url,
    }


def main() -> None:
    inventory = json.loads(INVENTORY.read_text())
    site_data = json.loads(SITE_DATA.read_text())
    core_routes = {record["path"] for record in site_data["pages"]}
    candidates: set[str] = set()

    for raw_url in inventory["internal_links"]:
        path = normalize_path(raw_url)
        if not path or path in core_routes:
            continue
        if path.startswith("/services/") or path.startswith("/category/"):
            continue
        candidates.add(path)

    session = requests.Session()
    session.headers.update({"User-Agent": "NYC-Cleaning-Migration-Audit/1.0"})
    articles: list[dict] = []
    for index, path in enumerate(sorted(candidates), 1):
        article = extract_article(path, session)
        if article:
            articles.append(article)
        if index % 20 == 0:
            time.sleep(0.25)

    articles.sort(key=lambda item: item["path"])
    OUTPUT_JSON.write_text(json.dumps(articles, indent=2, ensure_ascii=False) + "\n")

    lines = [
        "# Legacy Article Inventory",
        "",
        f"Extracted **{len(articles)}** genuine article routes from the live site for static preservation until the phase-two CMS migration.",
        "",
        "WordPress uploads, feeds, API endpoints, author/tag archives, query-string utilities, and existing core/service routes are excluded.",
        "",
        "| Route | Title | Body blocks | Source |",
        "| --- | --- | ---: | --- |",
    ]
    for article in articles:
        title = article["title"].replace("|", "\\|")
        lines.append(
            f"| `{article['path']}` | {title} | {len(article['blocks'])} | {article['sourceUrl']} |"
        )
    OUTPUT_MD.write_text("\n".join(lines) + "\n")
    print(f"Extracted {len(articles)} legacy articles from {len(candidates)} candidate routes")


if __name__ == "__main__":
    main()
