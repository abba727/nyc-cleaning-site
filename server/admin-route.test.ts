import { describe, expect, it } from "vitest";
import { getDashboardAccessState } from "../client/src/lib/adminAccess";

describe("owner dashboard route gate", () => {
  it("keeps the route private while authentication is loading or absent", () => {
    expect(getDashboardAccessState(true, null)).toBe("loading");
    expect(getDashboardAccessState(false, null)).toBe("signed-out");
  });

  it("denies ordinary users and allows administrator identities", () => {
    expect(getDashboardAccessState(false, { role: "user" })).toBe("denied");
    expect(getDashboardAccessState(false, { role: "admin" })).toBe("allowed");
  });
});
