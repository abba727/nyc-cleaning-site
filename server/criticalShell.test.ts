import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("critical first-paint shell", () => {
  it("inlines the public-site background, text color, and font before self-hosted font loading", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    const criticalStyleIndex = html.indexOf('<style id="critical-shell">');
    const fontPreloadIndex = html.indexOf('/fonts/source-sans-3-latin-variable.woff2');

    expect(criticalStyleIndex).toBeGreaterThan(-1);
    expect(criticalStyleIndex).toBeLessThan(fontPreloadIndex);
    expect(html).toContain("background: #f7faf9");
    expect(html).toContain("color: #16212b");
    expect(html).toContain('font-family: "Source Sans 3", system-ui, sans-serif');
    expect(html).toContain("#root { min-height: 100vh; }");
  });
});
