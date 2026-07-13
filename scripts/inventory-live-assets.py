from pathlib import Path
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import json
import re
import requests

project = Path('/home/ubuntu/nyc-cleaning-redesign')
audit = json.loads((project / 'docs/source-audit/live-pages.json').read_text())
urls = [item['input'] for item in audit['results']]
internal_links = set()
media_assets = set()
page_status = []
headers = {'User-Agent': 'Mozilla/5.0 (compatible; NYC-Cleaning-Migration-Audit/1.0)'}

for url in urls:
    try:
        response = requests.get(url, headers=headers, timeout=20)
        page_status.append({'url': url, 'status': response.status_code, 'final_url': response.url})
        soup = BeautifulSoup(response.text, 'html.parser')
        for node in soup.find_all(href=True):
            target = urljoin(response.url, node.get('href'))
            parsed = urlparse(target)
            if parsed.netloc.endswith('nyccleaning.co'):
                internal_links.add(parsed._replace(fragment='').geturl())
        for node in soup.find_all(src=True):
            target = urljoin(response.url, node.get('src'))
            parsed = urlparse(target)
            if parsed.netloc.endswith('nyccleaning.co'):
                media_assets.add(parsed._replace(fragment='').geturl())
        for node in soup.find_all(srcset=True):
            for item in node.get('srcset').split(','):
                candidate = item.strip().split(' ')[0]
                if not candidate:
                    continue
                target = urljoin(response.url, candidate)
                parsed = urlparse(target)
                if parsed.netloc.endswith('nyccleaning.co'):
                    media_assets.add(parsed._replace(fragment='').geturl())
        for attribute in ('data-src', 'data-lazy-src', 'data-original'):
            for node in soup.find_all(attrs={attribute: True}):
                target = urljoin(response.url, node.get(attribute))
                parsed = urlparse(target)
                if parsed.netloc.endswith('nyccleaning.co'):
                    media_assets.add(parsed._replace(fragment='').geturl())
        for node in soup.select('meta[property="og:image"], meta[name="twitter:image"], link[rel~="icon"], link[rel="apple-touch-icon"]'):
            value = node.get('content') or node.get('href')
            if value:
                target = urljoin(response.url, value)
                parsed = urlparse(target)
                if parsed.netloc.endswith('nyccleaning.co'):
                    media_assets.add(parsed._replace(fragment='').geturl())
        for match in re.findall(r'url\(["\']?([^"\')]+)', response.text, flags=re.I):
            target = urljoin(response.url, match)
            parsed = urlparse(target)
            if parsed.netloc.endswith('nyccleaning.co') and not parsed.path.endswith(('.css', '.js')):
                media_assets.add(parsed._replace(fragment='').geturl())
    except Exception as exc:
        page_status.append({'url': url, 'status': 'error', 'error': str(exc)})

inventory = {
    'audited_pages': page_status,
    'internal_links': sorted(internal_links),
    'media_assets': sorted(media_assets),
}
output = project / 'docs/source-audit/live-link-media-inventory.json'
output.write_text(json.dumps(inventory, indent=2), encoding='utf-8')

markdown = project / 'docs/source-audit/live-link-media-inventory.md'
with markdown.open('w', encoding='utf-8') as out:
    out.write('# Live Website Link and Media Inventory\n\n')
    out.write(f"Audited **{len(page_status)}** source pages, found **{len(internal_links)}** internal links and **{len(media_assets)}** first-party media references.\n\n")
    out.write('## Internal links\n\n')
    out.write('\n'.join(f'- {link}' for link in sorted(internal_links)))
    out.write('\n\n## Media assets\n\n')
    out.write('\n'.join(f'- {asset}' for asset in sorted(media_assets)))
    out.write('\n')

print(f'Audited {len(page_status)} pages: {len(internal_links)} internal links, {len(media_assets)} media assets')
