import { describe, expect, it } from "vitest";
import { extractServiceFaqs } from "../client/src/components/PublicPage";
import { brandAssets } from "../client/src/content/assets";
import { serviceGroups, serviceName } from "../client/src/content/site";

describe("public service content", () => {
  it("does not assign the known failed-generation placeholders to public page heroes", () => {
    const failedGenerationAssets = new Set([
      "/manus-storage/nyc-cleaning-about-team-v2_9f9c83de.png",
      "/manus-storage/nyc-cleaning-careers-v2_55866292.png",
      "/manus-storage/nyc-cleaning-contact-v2_f579150a.png",
      "/manus-storage/nyc-cleaning-service-area-v2_f9738d26.png",
      "/manus-storage/nyc-cleaning-about-hero-20260716_0aa622d3.png",
      "/manus-storage/nyc-cleaning-careers-hero-20260716_d8637cd8.png",
      "/manus-storage/nyc-cleaning-service-area-hero-20260716_c7298907.png",
    ]);

    expect(brandAssets.contact).toBe("/manus-storage/nyc-cleaning-contact-hero-20260716_3e0ac94a.png");
    expect(brandAssets.aboutTeam).toBe(brandAssets.staffing);
    expect(brandAssets.careers).toBe(brandAssets.janitorial);
    expect(brandAssets.serviceArea).toBe(brandAssets.propertyMaintenance);
    expect([brandAssets.aboutTeam, brandAssets.careers, brandAssets.contact, brandAssets.serviceArea].every(asset => asset.startsWith("/manus-storage/") && !failedGenerationAssets.has(asset))).toBe(true);
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
