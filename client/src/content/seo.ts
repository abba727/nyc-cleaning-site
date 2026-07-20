import type { LegacyContent, SitePage } from "./site";
import { normalizePath } from "./site";

export const SEO_TITLE_MAX_LENGTH = 60;
export const SEO_DESCRIPTION_MAX_LENGTH = 160;

export const canonicalRedirects: Record<string, string> = {
  "/services/": "/cleaning-service-nyc/",
  "/about/": "/about-us/",
  "/privacy-policy/": "/service-guru-app-privacy-policy/",
  "/commercial-cleaning-nyc/": "/services/commercial-cleaning-nyc/",
  "/category/blog/": "/blog/",
  "/category/cleaning-services/": "/blog/",
  "/category/uncategorized/": "/blog/",
};

const pageSeoOverrides: Record<string, { title?: string; description?: string; indexable?: boolean }> = {
  "/": {
    title: "NYC Cleaning & Building Maintenance Services",
    description: "Commercial cleaning, building maintenance, staffing, and property care for offices, residences, and facilities across New York City.",
  },
  "/about-us/": {
    title: "About NYC Cleaning and Maintenance",
    description: "Meet the NYC Cleaning and Maintenance team and learn how we support commercial and residential properties across New York City.",
  },
  "/services/commercial-building-maintenance-nyc/": {
    title: "Commercial Building Maintenance NYC",
  },
  "/service-guru-app-privacy-policy/": {
    title: "Service Guru Privacy Policy",
    description: "Read the privacy policy for the Service Guru application from NYC Cleaning and Maintenance.",
    indexable: false,
  },
};

const legacySeoTitleOverrides: Record<string, string> = {
  "/cleaning-challenges-unique-to-new-york-city-buildings-and-how-to-manage-them-effectively/": "NYC Building Cleaning Challenges: Practical Solutions",
  "/how-often-should-your-office-be-professionally-cleaned-nyc-industry-standards-explained/": "NYC Office Cleaning Frequency: A Practical Guide",
  "/preventive-maintenance-for-nyc-commercial-buildings-save-money-before-problems-start/": "Preventive Maintenance for NYC Commercial Buildings",
  "/from-trash-to-fresh-the-importance-of-regular-garbage-bin-cleaning-in-nyc-buildings/": "Why Regular Garbage Bin Cleaning Matters in NYC",
  "/how-professional-janitorial-services-improve-office-productivity-and-employee-health/": "Janitorial Services for Healthier, Productive Offices",
  "/hallway-and-common-area-cleaning-the-first-impression-of-your-building-matters/": "Common Area Cleaning for Better First Impressions",
  "/the-ultimate-guide-to-apartment-cleaning-in-nyc-what-every-tenant-should-know/": "NYC Apartment Cleaning Guide for Tenants",
  "/5-signs-its-time-to-hire-a-professional-cleaning-service-for-your-nyc-office/": "5 Signs Your NYC Office Needs Professional Cleaning",
  "/daily-vs-weekly-cleaning-services-whats-best-for-your-commercial-property/": "Daily vs. Weekly Commercial Cleaning Services",
  "/post-construction-cleaning-in-nyc-what-to-expect-before-reopening-your-space/": "NYC Post-Construction Cleaning Before Reopening",
  "/managing-cleaning-and-maintenance-in-high-rise-buildings-nyc-best-practices/": "High-Rise Cleaning and Maintenance Best Practices",
  "/disinfecting-high-traffic-areas-in-your-workplace-to-ensure-employee-health/": "Disinfecting High-Traffic Workplace Areas",
  "/top-10-benefits-of-regular-commercial-building-maintenance-in-new-york-city/": "10 Benefits of Regular Commercial Building Maintenance",
  "/why-building-repair-and-maintenance-shouldnt-be-put-off-in-a-city-like-nyc/": "Why NYC Building Repairs Should Not Wait",
  "/how-to-solve-the-top-cleaning-challenges-for-your-new-york-city-restaurant/": "Solving NYC Restaurant Cleaning Challenges",
  "/top-germ-hotspots-in-nyc-commercial-buildings-nyc-cleaning-maintenance/": "Top Germ Hotspots in NYC Commercial Buildings",
  "/nycs-hidden-grime-cleaning-tips-for-high-traffic-areas-in-your-business/": "Cleaning High-Traffic Areas in Your NYC Business",
  "/the-cost-effectiveness-of-hiring-a-cleaning-service-for-your-nyc-business/": "Are Cleaning Services Cost-Effective for NYC Businesses?",
  "/the-hidden-health-hazards-of-a-dirty-office-why-regular-cleaning-matters/": "Dirty Office Health Hazards and Regular Cleaning",
  "/doorman-services-elevating-the-residential-experience-in-nyc-high-rises/": "Doorman Services for NYC High-Rise Residents",
  "/how-to-choose-the-best-commercial-cleaning-service-for-your-nyc-business/": "Choosing a Commercial Cleaning Service in NYC",
  "/how-to-vet-a-commercial-cleaning-company-in-nyc-questions-you-must-ask-2/": "NYC Commercial Cleaning Vendor Vetting Checklist",
  "/how-to-vet-a-commercial-cleaning-company-in-nyc-questions-you-must-ask/": "Questions to Ask an NYC Commercial Cleaning Company",
  "/nyc-building-maintenance-management-tips-for-efficiency-and-compliance/": "NYC Building Maintenance: Efficiency and Compliance",
  "/the-hidden-health-hazards-in-your-office-why-regular-cleaning-matters/": "Office Health Hazards and Why Cleaning Matters",
  "/the-importance-of-cleaning-in-creating-a-professional-first-impression/": "How Cleaning Creates a Professional First Impression",
  "/why-outsourcing-cleaning-and-maintenance-beats-managing-in-house-staff/": "Outsourced Cleaning vs. In-House Staff",
  "/deep-cleaning-101-what-it-includes-and-why-its-worth-the-investment/": "Deep Cleaning 101: What It Includes and Why It Matters",
  "/how-to-budget-for-commercial-cleaning-and-maintenance-services-in-nyc/": "Budgeting for NYC Commercial Cleaning and Maintenance",
  "/the-hidden-costs-of-neglecting-commercial-property-maintenance-in-nyc/": "Hidden Costs of Neglecting NYC Property Maintenance",
  "/top-reasons-your-nyc-building-needs-professional-common-area-cleaning/": "Why NYC Buildings Need Professional Common Area Cleaning",
  "/emergency-cleaning-services-in-nyc-what-to-do-when-disaster-strikes/": "Emergency Cleaning Services in NYC: What to Do",
  "/post-construction-cleaning-in-nyc-what-property-owners-need-to-know/": "NYC Post-Construction Cleaning for Property Owners",
  "/post-construction-cleaning-tips-for-nyc-commercial-spaces/": "Post-Construction Cleaning Tips for NYC Businesses",
  "/how-proper-maintenance-prevents-common-nyc-building-code-violations/": "Preventing NYC Building Code Issues With Maintenance",
  "/how-to-prevent-the-top-5-maintenance-issues-in-nyc-office-buildings/": "Preventing 5 Common NYC Office Maintenance Issues",
  "/the-difference-between-standard-cleaning-and-deep-cleaning-services/": "Standard Cleaning vs. Deep Cleaning Services",
  "/the-roi-of-professional-cleaning-services-for-commercial-properties/": "ROI of Commercial Property Cleaning Services",
  "/top-10-cleaning-tasks-that-every-commercial-space-should-prioritize-a-must-do-cleaning-checklist-for-offices-retail-spaces-and-industrial-sites/": "10 Essential Cleaning Tasks for Commercial Spaces",
  "/spring-building-maintenance-checklist-for-new-york-city-properties/": "Spring Maintenance Checklist for NYC Properties",
  "/the-link-between-clean-workspaces-and-reduced-sick-days-2/": "Clean Workspaces and Reduced Office Sick Days",
  "/winterization-tips-for-nyc-properties-avoid-costly-weather-damage/": "NYC Property Winterization Tips",
  "/eco-friendly-cleaning-in-nyc-products-and-practices-that-work/": "Eco-Friendly Cleaning Products That Work in NYC",
  "/eco-friendly-cleaning-in-nyc-products-and-practices-that-work-2/": "Green Cleaning Products for NYC Commercial Buildings",
  "/eco-friendly-cleaning-in-nyc-products-and-practices-that-work-3/": "Eco-Friendly Cleaning Practices for NYC Properties",
  "/eco-friendly-cleaning-in-nyc-products-and-practices-that-work-4/": "Sustainable Cleaning Products and Practices in NYC",
};

function clampTitle(title: string) {
  const normalized = title.replace(/\s+/g, " ").trim();
  if (normalized.length <= SEO_TITLE_MAX_LENGTH) return normalized;
  const clipped = normalized.slice(0, SEO_TITLE_MAX_LENGTH + 1);
  const boundary = clipped.lastIndexOf(" ");
  return clipped.slice(0, boundary >= 42 ? boundary : SEO_TITLE_MAX_LENGTH).replace(/[\s,;:|–—-]+$/g, "");
}

function clampDescription(description: string) {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (normalized.length <= SEO_DESCRIPTION_MAX_LENGTH) return normalized;
  const clipped = normalized.slice(0, SEO_DESCRIPTION_MAX_LENGTH + 1);
  const boundary = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, boundary >= 120 ? boundary : SEO_DESCRIPTION_MAX_LENGTH).replace(/[\s,;:–—-]+$/g, "")}.`;
}

export function getPageSeo(page: SitePage) {
  const path = normalizePath(page.path);
  const override = pageSeoOverrides[path] || {};
  return {
    path,
    title: clampTitle(override.title || page.title),
    description: clampDescription(override.description || page.description),
    h1: page.h1,
    kind: page.kind,
    indexable: override.indexable !== false,
  };
}

export function getLegacySeo(content: LegacyContent) {
  const path = normalizePath(content.path);
  if (content.kind === "archive") return getArchiveSeo(path);
  return {
    path,
    title: clampTitle(legacySeoTitleOverrides[path] || content.title),
    description: clampDescription(content.description),
    h1: content.title,
    kind: content.kind === "article" ? "article" : "archive",
    indexable: true,
  };
}

export function getArchiveSeo(path: string) {
  const normalized = normalizePath(path);
  const match = normalized.match(/^\/(\d{4})\/(\d{2})\/$/);
  if (match) {
    const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
    return {
      path: normalized,
      title: `${label} Cleaning Insights | NYC Cleaning`,
      description: `Browse NYC Cleaning and Maintenance insights published in ${label}, covering commercial cleaning and property care.`,
      h1: `${label} Cleaning Insights`,
      kind: "archive",
      indexable: true,
    };
  }
  return {
    path: "/blog/",
    title: "NYC Cleaning and Property Maintenance Insights",
    description: "Practical commercial cleaning and property-maintenance guidance from NYC Cleaning and Maintenance.",
    h1: "Cleaning and Property Maintenance Insights",
    kind: "archive",
    indexable: true,
  };
}

export function getCanonicalRedirect(path: string) {
  return canonicalRedirects[normalizePath(path)] || null;
}
