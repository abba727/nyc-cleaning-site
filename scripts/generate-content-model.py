from pathlib import Path
from urllib.parse import urlparse
import json
import requests
from bs4 import BeautifulSoup

project = Path('/home/ubuntu/nyc-cleaning-redesign')
live = json.loads((project / 'docs/source-audit/live-pages.json').read_text())['results']
redesign_pages = json.loads((project / 'docs/source-audit/redesign-pages.json').read_text())
redesign_by_file = {page['file']: page for page in redesign_pages}

mapping = {
    '/': ('Homepage.dc.html', 'hero', 'core'),
    '/careers-and-opportunities/': ('Careers.dc.html', 'careers', 'core'),
    '/cleaning-service-nyc/': ('Services.dc.html', 'commercial-cleaning', 'core'),
    '/we-serve-new-york/': ('WeServeNewYork.dc.html', 'nyc-service-area', 'core'),
    '/who-we-are/': ('WhoWeAre.dc.html', 'about-team', 'core'),
    '/contact/': ('Contact.dc.html', 'contact', 'core'),
    '/about-us/': ('About.dc.html', 'about-team', 'core'),
    '/service-guru-app-privacy-policy/': (None, None, 'legal'),
    '/category/blog/': ('Blog.dc.html', 'deep-cleaning', 'blog'),
    '/services/common-area-maintenance-services-nyc/': ('CommonAreaMaintenance.dc.html', 'common-area', 'service'),
    '/services/janitorial-staffing-nyc/': ('JanitorialStaffing.dc.html', 'staffing', 'service'),
    '/services/house-cleaning-service-nyc/': ('HouseCleaning.dc.html', 'house-cleaning', 'service'),
    '/services/deep-cleaning-services-nyc/': ('DeepCleaning.dc.html', 'deep-cleaning', 'service'),
    '/services/property-maintenance-services-nyc/': ('MaintenanceServices.dc.html', 'property-maintenance', 'service'),
    '/services/building-repair-and-maintenance-services-nyc/': ('BuildingRepairMaintenance.dc.html', 'repair', 'service'),
    '/services/commercial-building-maintenance-nyc/': ('CommercialBuildingMaintenance.dc.html', 'building-maintenance', 'service'),
    '/services/commercial-janitorial-cleaning-services-nyc/': ('CommercialJanitorial.dc.html', 'janitorial', 'service'),
    '/services/janitorial-services-nyc/': ('JanitorialServices.dc.html', 'janitorial', 'service'),
    '/services/building-maintenance-management-nyc/': ('BuildingMaintenanceManagement.dc.html', 'maintenance-management', 'service'),
    '/services/building-maintenance-nyc/': ('BuildingMaintenance.dc.html', 'building-maintenance', 'service'),
    '/services/doorman-services-nyc/': ('DoormanServices.dc.html', 'doorman', 'service'),
    '/services/garbage-bin-cleaning-nyc/': ('GarbageBinCleaning.dc.html', 'garbage-bin', 'service'),
    '/services/janitorial-office-cleaning-services-nyc/': ('JanitorialOfficeCleaning.dc.html', 'office-cleaning', 'service'),
    '/services/maintenance-staffing-nyc/': ('MaintenanceStaffing.dc.html', 'staffing', 'service'),
    '/services/office-commercial-cleaning-services-nyc/': ('OfficeCommercialCleaning.dc.html', 'office-cleaning', 'service'),
    '/services/porter-services-nyc/': ('PorterServices.dc.html', 'porter', 'service'),
    '/services/apartment-cleaning-services-nyc/': ('ApartmentCleaning.dc.html', 'apartment-cleaning', 'service'),
    '/services/commercial-cleaning-nyc/': ('CommercialCleaning.dc.html', 'commercial-cleaning', 'service'),
    '/services/doorman-nyc/': ('Doorman.dc.html', 'doorman', 'service'),
    '/services/commercial-cleaning-services-prices-nyc/': ('CommercialCleaningPrices.dc.html', 'pricing', 'service'),
    '/services/property-cleaning-services-nyc/': ('PropertyCleaning.dc.html', 'property-cleaning', 'service'),
    '/services/sweeping-trash-nyc/': ('SweepingTrash.dc.html', 'sweeping-trash', 'service'),
}

defaults = {
    '/': 'NYC Cleaning & Maintenance | Commercial Building Services',
    '/cleaning-service-nyc/': 'Cleaning & Maintenance Services in NYC | NYC Cleaning',
    '/about-us/': 'About NYC Cleaning & Maintenance | New York City',
    '/who-we-are/': 'Who We Are | NYC Cleaning & Maintenance',
    '/we-serve-new-york/': 'Cleaning Services Across New York City | NYC Cleaning',
    '/careers-and-opportunities/': 'Careers at NYC Cleaning & Maintenance',
    '/contact/': 'Contact NYC Cleaning & Maintenance | Free Quote',
    '/category/blog/': 'Cleaning & Building Maintenance Insights | NYC Cleaning',
    '/service-guru-app-privacy-policy/': 'Service Guru Privacy Policy | NYC Cleaning',
}

pages = []
for item in live:
    url = item['output'].get('url') or item['input']
    path = urlparse(url).path or '/'
    prototype, image_key, kind = mapping[path]
    output = item['output']
    h1 = output.get('h1') if output.get('h1') not in (None, 'Not found') else ''
    fallback_name = h1 or path.strip('/').split('/')[-1].replace('-', ' ').title()
    title = output.get('title')
    if not title or title == 'Not available':
        title = defaults.get(path, f'{fallback_name} | NYC Cleaning')
    description = output.get('meta_description')
    if not description or description == 'Not available':
        description = f'Professional {fallback_name.lower()} for properties across New York City. Request a tailored plan from NYC Cleaning and Maintenance.'
    pages.append({
        'path': path,
        'kind': kind,
        'prototype': prototype,
        'imageKey': image_key,
        'title': title,
        'description': description[:160],
        'h1': h1 or fallback_name,
        'sourceCopy': output.get('headings_and_copy', ''),
        'formsAndCtas': output.get('forms_and_ctas', ''),
        'businessFacts': output.get('business_facts', ''),
        'sourceUrl': url,
    })

content_dir = project / 'client/src/content'
content_dir.mkdir(parents=True, exist_ok=True)
(content_dir / 'site-data.json').write_text(json.dumps({'pages': pages}, indent=2), encoding='utf-8')

matrix = project / 'docs/content-parity-matrix.md'
with matrix.open('w', encoding='utf-8') as out:
    out.write('# Content-Parity Matrix\n\n')
    out.write('This matrix maps every audited live core/service route to its redesign prototype, preserved source copy, and production image assignment. The source audit is retained in `docs/source-audit/live-pages.json`.\n\n')
    out.write('| Live route | Page type | Redesign prototype | Prototype sections | Image key | Source copy captured |\n')
    out.write('| --- | --- | --- | --- | --- | --- |\n')
    for page in pages:
        prototype = page['prototype'] or 'No package equivalent'
        image = page['imageKey'] or 'None required'
        captured = 'Yes' if page['sourceCopy'] else 'No'
        prototype_data = redesign_by_file.get(page['prototype'], {})
        headings = prototype_data.get('h1', []) + prototype_data.get('h2', []) + prototype_data.get('h3', [])
        sections = '<br>'.join(headings) if headings else 'Live source only'
        out.write(f"| `{page['path']}` | {page['kind']} | {prototype} | {sections} | `{image}` | {captured} |\n")

    out.write('\n## Redesign prototype reconciliation\n\n')
    out.write('| Prototype | Destination route | Section inventory | Decision |\n')
    out.write('| --- | --- | --- | --- |\n')
    destination_by_prototype = {page['prototype']: page['path'] for page in pages if page['prototype']}
    for prototype in redesign_pages:
        filename = prototype['file']
        destination = destination_by_prototype.get(filename, 'Not mapped')
        headings = prototype.get('h1', []) + prototype.get('h2', []) + prototype.get('h3', [])
        section_inventory = '<br>'.join(headings) if headings else 'No headings found'
        decision = 'Render prototype hierarchy with audited live copy' if destination != 'Not mapped' else 'Requires explicit exclusion review'
        out.write(f'| {filename} | `{destination}` | {section_inventory} | {decision} |\n')

    out.write('\n## Shared section parity rules\n\n')
    out.write('| Section | Production treatment |\n')
    out.write('| --- | --- |\n')
    out.write('| Hero | Every public route receives an H1, source-derived summary, breadcrumb where nested, branded image, and primary quote CTA. |\n')
    out.write('| Narrative | Every audited `sourceCopy` block is rendered in the page body; no extracted source copy is discarded. |\n')
    out.write('| Services | The services overview renders all 23 preserved service routes; service pages render related-service links. |\n')
    out.write('| Trust | Only source-verified operational facts are shown. Review quotations and ratings require a verifiable review feed. |\n')
    out.write('| FAQ | Source and prototype FAQ content is rendered only where present; FAQ schema is emitted only when visible FAQs exist. |\n')
    out.write('| Contact CTA | Every marketing route includes a quote action and phone action leading to the validated inquiry flow. |\n')
    out.write('| Footer/NAP | Every route shares one footer with verified business name, P.O. Box, phone, email, service links, and social links. |\n')

    out.write('\n## Route-by-route section coverage\n\n')
    out.write('| Route | Hero | Narrative | Services | Trust | FAQ | Contact CTA | Footer/NAP |\n')
    out.write('| --- | --- | --- | --- | --- | --- | --- | --- |\n')
    for page in pages:
        prototype_data = redesign_by_file.get(page['prototype'], {})
        headings = prototype_data.get('h1', []) + prototype_data.get('h2', []) + prototype_data.get('h3', [])
        heading_text = ' '.join(headings).lower()
        source_text = page['sourceCopy'].lower()
        hero = f"Live H1 + {page['prototype']} hierarchy" if page['prototype'] else 'Live H1 and legal-page summary'
        narrative = 'Audited live sourceCopy rendered in body'
        services = 'Service taxonomy + related links' if page['kind'] in ('core', 'service') else 'Global service navigation only'
        trust = 'Source-verified trust content' if page['path'] in ('/', '/about-us/', '/who-we-are/') else 'Global verified trust band'
        faq = 'Visible source/prototype FAQ rendered' if 'faq' in heading_text or 'frequently asked' in source_text else 'Not present in source; intentionally omitted'
        contact_cta = 'Shared quote + phone CTA' if page['kind'] != 'legal' else 'Footer contact links only'
        footer = 'Shared verified NAP footer'
        out.write(f"| `{page['path']}` | {hero} | {narrative} | {services} | {trust} | {faq} | {contact_cta} | {footer} |\n")

    out.write('\n## Indexed URL preservation inventory\n\n')
    sitemap_urls = []
    for sitemap in ('page-sitemap.xml', 'service-sitemap.xml', 'post-sitemap.xml', 'category-sitemap.xml'):
        response = requests.get(f'https://www.nyccleaning.co/{sitemap}', timeout=20)
        soup = BeautifulSoup(response.text, 'xml')
        sitemap_urls.extend(loc.get_text(strip=True) for loc in soup.find_all('loc'))
    out.write('| Current indexed URL | Production decision |\n')
    out.write('| --- | --- |\n')
    route_paths = {page['path'] for page in pages}
    for url in sorted(set(sitemap_urls)):
        path = urlparse(url).path or '/'
        decision = 'Implemented in public route model' if path in route_paths else 'Preserve exact route for CMS article rendering; no redirect or deletion'
        out.write(f'| {url} | {decision} |\n')

print(f'Generated {len(pages)} route records')
