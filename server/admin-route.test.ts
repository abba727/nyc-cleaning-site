import { describe, expect, it } from "vitest";
import { getDashboardAccessState } from "../client/src/lib/adminAccess";

describe("CMS dashboard route gate", () => {
  it("keeps the route private while authentication is loading or absent", () => {
    expect(getDashboardAccessState(true, null)).toBe("loading");
    expect(getDashboardAccessState(false, null)).toBe("signed-out");
  });

  it("denies ordinary users and allows both CMS roles", () => {
    expect(getDashboardAccessState(false, { role: "user" })).toBe("denied");
    expect(getDashboardAccessState(false, { role: "admin" })).toBe("allowed");
    expect(getDashboardAccessState(false, { role: "content_manager" })).toBe("allowed");
  });
});
