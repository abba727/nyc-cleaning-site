import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CMS user invitation controls", () => {
  it("keeps the email, role, and invitation action aligned at a shared height", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/AdminUsers.tsx"), "utf8");

    expect(page).toContain("md:grid-cols-[minmax(280px,1fr)_220px_180px] md:items-end");
    expect(page).toContain('className="h-11 bg-white" id="invite-user-email"');
    expect(page).toContain('className="w-full data-[size=default]:h-11" id="invite-user-role"');
    expect(page).toContain('className="h-11 w-full bg-[#14846f]');
  });

  it("renders shared Select surfaces as opaque, high-stacking menus", () => {
    const select = readFileSync(resolve(process.cwd(), "client/src/components/ui/select.tsx"), "utf8");

    expect(select).toContain("z-[100] isolate");
    expect(select).toContain("bg-white text-[#16212b]");
    expect(select).toContain("dark:bg-[#0b1f33] dark:text-white");
    expect(select).not.toContain("bg-popover text-popover-foreground");
  });
});
