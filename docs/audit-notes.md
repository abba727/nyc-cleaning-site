# NYC Cleaning Website Audit Notes

## Audit scope

The source audit covers the live website at `https://www.nyccleaning.co/`, its published XML sitemaps and crawler directives, and the supplied `Websiteredesignproject.zip` package. The redesign package contains 32 page prototypes plus shared `site.css` and `support.js` files.

## Verified live brand and company details

| Field | Live source value | Audit note |
| --- | --- | --- |
| Public brand name | NYC Cleaning and Maintenance | Used in the live page title, homepage heading, and footer copy. |
| Logo asset | `https://www.nyccleaning.co/wp-content/uploads/2024/07/Logo.png.webp` | This is the current visible logo and must be preserved rather than replaced with the redesign prototype’s temporary “NC” mark. |
| Phone | `(212) 918-9037` | Repeated in navigation, hero calls to action, and footer. |
| Email | `info@nyccleaning.co` | Repeated in the live footer. |
| Footer mailing address | `P.O. Box 660009 Fresh Meadows, NY 11366` | Repeated in the live footer and redesign package. |
| Structured-data street address | `102-10 Metropolitan Avenue, Suite 200, Forest Hills, NY 11375` | The live LocalBusiness schema conflicts with the visible footer address and requires a deliberate canonical NAP decision before final structured data is published. |
| Service area | New York City metro area / five boroughs | Supported by live homepage copy and service navigation. |

## Live homepage SEO baseline

| SEO field | Current value |
| --- | --- |
| Title | Cleaning and Maintenance Company: Professional Services |
| Meta description | Expert cleaning and maintenance solutions for New York city commercial properties, keeping your property clean and maintained year round. |
| Canonical | `https://www.nyccleaning.co/` |
| Robots | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` |
| Open Graph site name | NYC Cleaning and Maintenance |
| Open Graph type | website |
| Twitter card | summary_large_image |
| Structured data | WebPage, BreadcrumbList, WebSite, and LocalBusiness graphs are present. |

The current `robots.txt` disallows `/wp-json/` and `/?rest_route=` and references `http://www.nyccleaning.co/sitemap_index.xml`. The replacement should use a secure HTTPS sitemap URL and remove WordPress-specific crawl directives that no longer apply.

## Live public route inventory

The live page sitemap contains the homepage, careers, services overview, New York service-area page, who-we-are page, contact page, about page, and the Service Guru app privacy policy. The live service sitemap contains the following 22 preserved service paths.

| Service route | Service name |
| --- | --- |
| `/services/common-area-maintenance-services-nyc/` | Common Area Maintenance Services |
| `/services/janitorial-staffing-nyc/` | Janitorial Staffing |
| `/services/house-cleaning-service-nyc/` | House Cleaning Service |
| `/services/deep-cleaning-services-nyc/` | Deep Cleaning Services |
| `/services/property-maintenance-services-nyc/` | Property Maintenance Services |
| `/services/building-repair-and-maintenance-services-nyc/` | Building Repair and Maintenance Services |
| `/services/commercial-building-maintenance-nyc/` | Commercial Building Maintenance |
| `/services/commercial-janitorial-cleaning-services-nyc/` | Commercial Janitorial Cleaning Services |
| `/services/janitorial-services-nyc/` | Janitorial Services |
| `/services/building-maintenance-management-nyc/` | Building Maintenance Management |
| `/services/building-maintenance-nyc/` | Building Maintenance |
| `/services/doorman-services-nyc/` | Doorman Services |
| `/services/garbage-bin-cleaning-nyc/` | Garbage Bin Cleaning |
| `/services/janitorial-office-cleaning-services-nyc/` | Janitorial Office Cleaning Services |
| `/services/maintenance-staffing-nyc/` | Maintenance Staffing |
| `/services/office-commercial-cleaning-services-nyc/` | Office Commercial Cleaning Services |
| `/services/porter-services-nyc/` | Porter Services |
| `/services/apartment-cleaning-services-nyc/` | Apartment Cleaning Services |
| `/services/commercial-cleaning-nyc/` | Commercial Cleaning |
| `/services/doorman-nyc/` | Doorman |
| `/services/commercial-cleaning-services-prices-nyc/` | Commercial Cleaning Services Prices |
| `/services/property-cleaning-services-nyc/` | Property Cleaning Services |
| `/services/sweeping-trash-nyc/` | Sweeping and Trash Services |

The category sitemap contains `/category/blog/`. The post sitemap contains a substantial archive of article URLs through June 2026 and must be preserved in the migration plan even though the editorial backend is scheduled as a second phase.

## Live homepage content baseline

The live homepage includes a sticky logo/navigation header; a hero describing full-service building maintenance and cleaning in the New York City metro area; Porter Services, Building Maintenance, and Doorman Services highlights; an estimate callout; company/about copy; trust indicators for expert cleaners, local service, experienced staff, and 500+ active clients; recent blog articles; three frequently asked questions; a reviews carousel; a contact form; and footer NAP details.

## Redesign package findings

The redesign package uses a distinct editorial-commercial direction built around navy, warm cream, off-white, and gold, with Archivo headings and Source Sans 3 body copy. It includes prototypes for the homepage, services overview, all major service pages, About, Who We Are, Careers, Contact, Blog, and We Serve New York.

The prototype’s header uses a temporary text-based “NC” mark instead of the real company logo. Every photographic area is still a patterned placeholder and must be replaced. The prototype also introduces unverified numeric claims such as “15+ Years in NYC” and “24/7 Scheduling Flexibility”; these claims should not be published unless independently supported by the current source content or confirmed by the owner.

## Reviews and testimonials constraint

The live homepage currently displays named testimonial quotes and five-star presentations. The supplied redesign repeats several of these quotes. The production implementation must not fabricate, mock, seed, or hardcode review content. A reviews section may only display content obtained through a verified, authorized review source or another compliant dynamic source; otherwise it should present a neutral invitation to read verified reviews rather than publishing unverified static quotes or ratings.

## Immediate implementation implications

The rebuild should preserve the existing public URL paths, carry forward current metadata where it remains accurate, introduce route-specific canonical/Open Graph data, and use server-side rendering so crawlers and social scrapers receive complete HTML. The inquiry workflow will store validated submissions in the database before attempting an owner notification, and notification failure will be logged without discarding the saved inquiry.
