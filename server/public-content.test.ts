import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { extractServiceFaqs } from "../client/src/components/PublicPage";
import { brandAssets } from "../client/src/content/assets";
import { getPageImage, homepageServices, serviceGroups, serviceName } from "../client/src/content/site";

describe("public service content", () => {
  it("does not assign known failed or retired placeholder assets to public page heroes", () => {
    const blockedAssets = new Set([
      "/manus-storage/nyc-cleaning-about-team-v2_9f9c83de.png",
      "/manus-storage/nyc-cleaning-careers-v2_55866292.png",
      "/manus-storage/nyc-cleaning-contact-v2_f579150a.png",
      "/manus-storage/nyc-cleaning-service-area-v2_f9738d26.png",
      "/manus-storage/nyc-cleaning-about-hero-20260716_0aa622d3.png",
      "/manus-storage/nyc-cleaning-careers-hero-20260716_d8637cd8.png",
      "/manus-storage/nyc-cleaning-service-area-hero-20260716_c7298907.png",
      "/manus-storage/nyc-cleaning-staffing-v2_30b09bf9.png",
    ]);

    expect(brandAssets.contact).toBe("/manus-storage/nyc-cleaning-contact-hero-20260716_3e0ac94a.png");
    expect(brandAssets.aboutTeam).toBe("/manus-storage/nyc-cleaning-who-we-are-team-20260716_3cda4186.webp");
    expect(brandAssets.careers).toBe(brandAssets.janitorial);
    expect(brandAssets.serviceArea).toBe(brandAssets.propertyMaintenance);
    expect([brandAssets.aboutTeam, brandAssets.careers, brandAssets.contact, brandAssets.serviceArea].every(asset => asset.startsWith("/manus-storage/") && !blockedAssets.has(asset))).toBe(true);
  });

  it("presents a concise grouped service taxonomy without repetitive NYC suffixes", () => {
    const labels = serviceGroups.flatMap(group => group.services.map(serviceName));

    expect(serviceGroups.map(group => group.label)).toEqual([
      "Cleaning",
      "Building care",
      "Staffing & entry",
      "Specialty",
    ]);
    expect(labels.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.every(label => !/\bNYC\b/i.test(label))).toBe(true);
  });

  it("presents six unique homepage service tiles with valid routes and production images", () => {
    const paths = homepageServices.map(service => service.path);
    const images = homepageServices.map(getPageImage);

    expect(homepageServices).toHaveLength(6);
    expect(new Set(paths).size).toBe(6);
    expect(paths.every(path => path.startsWith("/services/") && path.endsWith("/"))).toBe(true);
    expect(images.every(image => image.startsWith("/manus-storage/") && !/failed|placeholder/i.test(image))).toBe(true);
    expect(homepageServices.map(serviceName)).toEqual([
      "Commercial Cleaning",
      "Office Cleaning",
      "Apartment Cleaning",
      "Deep Cleaning",
      "Porter Services",
      "Common Area Maintenance",
    ]);
  });

  it("keeps the homepage service grid balanced across desktop, tablet, and mobile", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

    expect(css).toContain(".service-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(css).toContain("@media (max-width: 1050px)");
    expect(css).toContain(".service-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain(".service-grid { grid-template-columns: 1fr; }");
  });

  it("extracts only explicit legacy questions and keeps their source answers", () => {
    const paragraphs = [
      "A tailored plan begins with a property walkthrough.",
      "How often should the service be scheduled? Frequency depends on traffic, surfaces, and operating hours.",
      "Inquire about staffing options for your building.",
      "Can service happen after business hours? Yes. The schedule can be aligned with building operations.",
    ];

    expect(extractServiceFaqs(paragraphs)).toEqual([
      {
        question: "How often should the service be scheduled?",
        answers: ["Frequency depends on traffic, surfaces, and operating hours."],
        sourceIndex: 1,
      },
      {
        question: "Can service happen after business hours?",
        answers: ["Yes. The schedule can be aligned with building operations."],
        sourceIndex: 3,
      },
    ]);
  });
});
