import rawSiteData from "./site-data.json";
import rawLegacyContent from "./legacy-articles.json";
import rawArticleImages from "./article-images.json";
import { brandAssets } from "./assets";

export type SitePage = {
  path: string;
  kind: "core" | "service" | "blog" | "legal";
  prototype: string;
  imageKey: string;
  title: string;
  description: string;
  h1: string;
  sourceCopy: string;
  formsAndCtas: string;
  businessFacts: string;
  sourceUrl: string;
};

export type LegacyBlock = {
  type: "h2" | "h3" | "p" | "li";
  text: string;
};

export type LegacyContent = {
  path: string;
  kind: "article" | "archive";
  title: string;
  description: string;
  publishedAt: string;
  blocks: LegacyBlock[];
  sourceUrl: string;
};

export const pages = rawSiteData.pages as SitePage[];
export const services = pages.filter(page => page.kind === "service");
const serviceLabelByPath: Record<string, string> = {
  "/services/common-area-maintenance-services-nyc/": "Common Area Maintenance",
  "/services/janitorial-staffing-nyc/": "Janitorial Staffing",
  "/services/house-cleaning-service-nyc/": "House Cleaning",
  "/services/deep-cleaning-services-nyc/": "Deep Cleaning",
  "/services/property-maintenance-services-nyc/": "Property Maintenance",
  "/services/building-repair-and-maintenance-services-nyc/": "Repairs & Maintenance",
  "/services/commercial-building-maintenance-nyc/": "Commercial Building Care",
  "/services/commercial-janitorial-cleaning-services-nyc/": "Commercial Janitorial",
  "/services/janitorial-services-nyc/": "Janitorial Services",
  "/services/building-maintenance-management-nyc/": "Maintenance Management",
  "/services/building-maintenance-nyc/": "Building Maintenance",
  "/services/doorman-services-nyc/": "Doorman Services",
  "/services/garbage-bin-cleaning-nyc/": "Bin Cleaning",
  "/services/janitorial-office-cleaning-services-nyc/": "Office Janitorial",
  "/services/maintenance-staffing-nyc/": "Maintenance Staffing",
  "/services/office-commercial-cleaning-services-nyc/": "Office Cleaning",
  "/services/porter-services-nyc/": "Porter Services",
  "/services/apartment-cleaning-services-nyc/": "Apartment Cleaning",
  "/services/commercial-cleaning-nyc/": "Commercial Cleaning",
  "/services/doorman-nyc/": "Doorman Services",
  "/services/commercial-cleaning-services-prices-nyc/": "Cleaning Pricing",
  "/services/property-cleaning-services-nyc/": "Property Cleaning",
  "/services/sweeping-trash-nyc/": "Sweeping & Trash Removal",
};

export const featuredServicePaths = [
  "/services/commercial-cleaning-nyc/",
  "/services/office-commercial-cleaning-services-nyc/",
  "/services/apartment-cleaning-services-nyc/",
  "/services/deep-cleaning-services-nyc/",
  "/services/porter-services-nyc/",
  "/services/common-area-maintenance-services-nyc/",
  "/services/property-maintenance-services-nyc/",
  "/services/building-repair-and-maintenance-services-nyc/",
  "/services/janitorial-staffing-nyc/",
  "/services/doorman-services-nyc/",
  "/services/sweeping-trash-nyc/",
  "/services/garbage-bin-cleaning-nyc/",
  "/services/building-maintenance-management-nyc/",
] as const;

export const featuredServices = featuredServicePaths
  .map(path => services.find(service => service.path === path))
  .filter((service): service is SitePage => Boolean(service));

export const serviceGroups = [
  { label: "Cleaning", paths: featuredServicePaths.slice(0, 4) },
  { label: "Building care", paths: featuredServicePaths.slice(4, 8) },
  { label: "Staffing & entry", paths: featuredServicePaths.slice(8, 10) },
  { label: "Specialty", paths: featuredServicePaths.slice(10, 13) },
].map(group => ({
  ...group,
  services: group.paths
    .map(path => services.find(service => service.path === path))
    .filter((service): service is SitePage => Boolean(service)),
}));
export const legacyContent = rawLegacyContent as LegacyContent[];
export const legacyArticles = legacyContent.filter(item => item.kind === "article");
export const legacyArchives = legacyContent.filter(item => item.kind === "archive");
const articleImages = rawArticleImages as Record<string, { src: string; alt: string }>;
export const blogArchivePaths = ["/blog/", "/category/blog/", "/category/cleaning-services/", "/category/uncategorized/"];

export const normalizePath = (path: string) => {
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";
  return clean === "/" ? clean : `${clean}/`;
};

const pageAliases: Record<string, string> = {
  "/services/": "/cleaning-service-nyc/",
  "/about/": "/about-us/",
  "/privacy-policy/": "/service-guru-app-privacy-policy/",
  "/commercial-cleaning-nyc/": "/services/commercial-cleaning-nyc/",
};

export const getPageByPath = (path: string) => {
  const normalized = normalizePath(path);
  const canonicalPath = pageAliases[normalized] || normalized;
  return pages.find(page => normalizePath(page.path) === canonicalPath);
};
export const getLegacyByPath = (path: string) => legacyContent.find(item => normalizePath(item.path) === normalizePath(path));
export const getArticleImage = (content: LegacyContent) => articleImages[normalizePath(content.path)]?.src || brandAssets.hero;
export const getArticleImageAlt = (content: LegacyContent) => articleImages[normalizePath(content.path)]?.alt || `Editorial image for ${content.title}`;

export const articlesForArchive = (path: string) => {
  const match = normalizePath(path).match(/^\/(\d{4})\/(\d{2})\/$/);
  if (!match) return legacyArticles;
  const [, year, month] = match;
  return legacyArticles.filter(article => article.publishedAt.startsWith(`${year}-${month}-`));
};

export const isBlogArchivePath = (path: string) => blogArchivePaths.includes(normalizePath(path));

const assetByImageKey: Record<string, string> = {
  hero: brandAssets.hero,
  careers: brandAssets.careers,
  contact: brandAssets.contact,
  "nyc-service-area": brandAssets.serviceArea,
  "about-team": brandAssets.aboutTeam,
  "commercial-cleaning": brandAssets.commercialCleaning,
  "deep-cleaning": brandAssets.deepCleaning,
  "common-area": brandAssets.commonArea,
  staffing: brandAssets.staffing,
  "house-cleaning": brandAssets.houseCleaning,
  "property-maintenance": brandAssets.propertyMaintenance,
  repair: brandAssets.repair,
  "building-maintenance": brandAssets.buildingMaintenance,
  janitorial: brandAssets.janitorial,
  "maintenance-management": brandAssets.maintenanceManagement,
  doorman: brandAssets.doorman,
  "garbage-bin": brandAssets.garbageBin,
  "office-cleaning": brandAssets.officeCleaning,
  porter: brandAssets.porter,
  "apartment-cleaning": brandAssets.apartmentCleaning,
  pricing: brandAssets.pricing,
  "property-cleaning": brandAssets.propertyCleaning,
  "sweeping-trash": brandAssets.sweepingTrash,
};

export const getPageImage = (page: SitePage) => assetByImageKey[page.imageKey] || brandAssets.commercialCleaning;

const forbiddenStaticReviewFragments = [
  "game-changer for our properties",
  "partnering with nyc cleaning",
  "couldn't be happier with the cleaning services",
  "couldn\\'t be happier with the cleaning services",
  "exceeded my expectations",
];

export const pageParagraphs = (page: SitePage) => {
  const seen = new Set<string>();
  return page.sourceCopy
    .split(/\||\n{1,}/)
    .map(value => value.replace(/\\'/g, "'").replace(/\s+/g, " ").trim())
    .filter(value => value.length > 18)
    .filter(value => !/^copyright/i.test(value))
    .filter(value => !forbiddenStaticReviewFragments.some(fragment => value.toLowerCase().includes(fragment)))
    .filter(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const serviceName = (page: SitePage) =>
  serviceLabelByPath[page.path] || page.h1
    .replace(/\s*\|.*$/, "")
    .replace(/\s+in New York.*$/i, "")
    .replace(/\s+in NYC.*$/i, "")
    .replace(/\s+NYC$/i, "")
    .trim();

export const siteOrigin = "https://www.nyccleaning.co";
export const company = {
  name: "NYC Cleaning and Maintenance",
  shortName: "NYC Cleaning",
  phoneDisplay: "(212) 918-9037",
  phoneHref: "+12129189037",
  email: "info@nyccleaning.co",
  address: "P.O. Box 660009, Fresh Meadows, NY 11366",
  serviceArea: "New York City metro area and all five boroughs",
};
