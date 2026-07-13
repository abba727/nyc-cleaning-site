import { describe, expect, it } from "vitest";
import { extractServiceFaqs } from "../client/src/components/PublicPage";
import { serviceGroups, serviceName } from "../client/src/content/site";

describe("public service content", () => {
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
