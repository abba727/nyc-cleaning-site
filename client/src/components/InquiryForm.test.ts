import { describe, expect, it } from "vitest";
import { formatUsPhone, validateInquiryValues } from "./InquiryForm";

describe("shared inquiry form helpers", () => {
  it.each([
    ["2129189037", "(212) 918-9037"],
    ["212-918-9037", "(212) 918-9037"],
    ["+1 (212) 918-9037", "(212) 918-9037"],
    ["212918", "(212) 918"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatUsPhone(input)).toBe(expected);
  });

  it("returns friendly field messages instead of exposing schema payloads", () => {
    expect(validateInquiryValues({ name: "A", email: "bad", phone: "212", serviceType: "", message: "short" })).toEqual({
      name: "Enter your full name.",
      email: "Enter a valid email address, such as name@example.com.",
      phone: "Enter a 10-digit US phone number.",
      serviceType: "Select the service you are interested in.",
      message: "Tell us a little more about the property or service you need.",
    });
  });

  it("accepts a complete valid request", () => {
    expect(validateInquiryValues({ name: "Jordan Rivera", email: "jordan@example.com", phone: "(212) 918-9037", serviceType: "Commercial Cleaning", message: "Please contact me about weekday office cleaning." })).toEqual({});
  });
});
