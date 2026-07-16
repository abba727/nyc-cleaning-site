import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CMS logout and session-expiration UI", () => {
  const dashboard = readFileSync("client/src/components/DashboardLayout.tsx", "utf8");
  const authHook = readFileSync("client/src/_core/hooks/useAuth.ts", "utf8");
  const login = readFileSync("client/src/pages/AdminLogin.tsx", "utf8");

  it("uses the dropdown selection event and always returns manual logout to the login screen", () => {
    expect(dashboard).toContain("onSelect={() => void handleLogout()}");
    expect(dashboard).toContain('window.location.replace("/admin?session=signed-out")');
    expect(dashboard).toContain("Signing out…");
  });

  it("clears stored credentials and redirects expired sessions with an explanatory message", () => {
    expect(authHook).toContain("getCmsSessionExpiration(token)");
    expect(authHook).toContain('window.location.replace("/admin?session=expired")');
    expect(login).toContain("Your 3-hour session expired. Please sign in again.");
    expect(login).toContain("You have been signed out securely.");
    expect(login).toContain("Keep me signed in if I close this browser (up to 3 hours)");
  });
});
