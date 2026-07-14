import { describe, expect, it, vi } from "vitest";

import {
  CMS_REMEMBERED_EMAIL_KEY,
  readRememberedCmsEmail,
  updateRememberedCmsEmail,
} from "../client/src/lib/rememberedEmail";

function storage(initialValue: string | null = null) {
  return {
    getItem: vi.fn(() => initialValue),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
}

describe("CMS remembered email", () => {
  it("normalizes and stores only the email address when requested", () => {
    const target = storage();

    updateRememberedCmsEmail(target, "  Albert.Aranbaev@Gmail.com  ", true);

    expect(target.setItem).toHaveBeenCalledWith(CMS_REMEMBERED_EMAIL_KEY, "albert.aranbaev@gmail.com");
    expect(target.setItem).toHaveBeenCalledTimes(1);
  });

  it("removes the saved email when the preference is cleared", () => {
    const target = storage();

    updateRememberedCmsEmail(target, "albert.aranbaev@gmail.com", false);

    expect(target.removeItem).toHaveBeenCalledWith(CMS_REMEMBERED_EMAIL_KEY);
    expect(target.setItem).not.toHaveBeenCalled();
  });

  it("reads a normalized remembered email without handling a password", () => {
    const target = storage("  Albert.Aranbaev@Gmail.com  ");

    expect(readRememberedCmsEmail(target)).toBe("albert.aranbaev@gmail.com");
    expect(target.getItem).toHaveBeenCalledWith(CMS_REMEMBERED_EMAIL_KEY);
  });
});
