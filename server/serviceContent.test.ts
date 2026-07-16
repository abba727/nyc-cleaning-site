import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serviceContentByPath } from "../client/src/content/service-content";
import { services } from "../client/src/content/site";

const canonicalServicePaths = services.map(service => service.path).sort();
const structuredServicePaths = Object.keys(serviceContentByPath).sort();

describe("service page content model", () => {
  it("covers every canonical service route without adding or removing URLs", () => {
    expect(structuredServicePaths).toEqual(canonicalServicePaths);
    expect(structuredServicePaths).toHaveLength(23);
  });

  it.each(structuredServicePaths)("gives %s the requested voice and structure", servicePath => {
    const content = serviceContentByPath[servicePath];
    const allCopy = [content.summary, content.intro, ...content.benefits].join(" ");

    expect(content.summary.length).toBeGreaterThan(70);
    expect(content.intro.length).toBeGreaterThan(140);
    expect(content.benefits).toHaveLength(4);
    expect(content.benefits.every(benefit => benefit.length > 55)).toBe(true);
    expect(content.relatedPaths).toHaveLength(3);
    expect(new Set(content.relatedPaths).size).toBe(3);
    expect(content.relatedPaths).not.toContain(servicePath);
    expect(content.relatedPaths.every(relatedPath => canonicalServicePaths.includes(relatedPath))).toBe(true);
    expect(allCopy).toMatch(/\b(?:we|our|us)\b/i);
    expect(allCopy).not.toMatch(/\b(?:they|their|them)\b/i);
  });

  it("renders the normalized introduction, benefit list, CTA, and related services from structured content", () => {
    const renderer = fs.readFileSync(
      path.resolve(process.cwd(), "client/src/components/PublicPage.tsx"),
      "utf8",
    );

    expect(renderer).toContain("getServiceContent(page.path)");
    expect(renderer).toContain('className="section service-intro-section"');
    expect(renderer).toContain('className="service-benefit-list"');
    expect(renderer).toContain("content.benefits.map");
    expect(renderer).toContain('className="section section-contact"');
    expect(renderer).toContain('className="section related-services-section"');
    expect(renderer).toContain("content.relatedPaths");
  });

  it("uses the structured summary in service cards instead of legacy source paragraphs", () => {
    const renderer = fs.readFileSync(
      path.resolve(process.cwd(), "client/src/components/PublicPage.tsx"),
      "utf8",
    );

    expect(renderer).toContain("{service.description}");
    expect(renderer).not.toContain("pageParagraphs(service)[0]");
  });
});
