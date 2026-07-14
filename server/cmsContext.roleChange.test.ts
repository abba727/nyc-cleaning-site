import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyCmsSessionToken: vi.fn(),
  getCmsUserById: vi.fn(),
}));

vi.mock("./cmsAuth", () => ({ verifyCmsSessionToken: mocks.verifyCmsSessionToken }));
vi.mock("./cmsDb", () => ({ getCmsUserById: mocks.getCmsUserById }));

import { createContext } from "./_core/context";

function options() {
  return {
    req: { cookies: { "app_session_id": "session-token" } },
    res: {},
  } as Parameters<typeof createContext>[0];
}

describe("role changes on the next authenticated request", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects the prior session immediately and applies the updated role to a refreshed session", async () => {
    mocks.getCmsUserById.mockResolvedValue({
      id: 7,
      openId: "cms:7",
      name: "Editor",
      email: "editor@example.com",
      role: "content_manager",
      isPrimaryAdmin: false,
      sessionVersion: 2,
    });

    mocks.verifyCmsSessionToken.mockResolvedValueOnce({ userId: 7, sessionVersion: 1 });
    await expect(createContext(options())).resolves.toMatchObject({ user: null });

    mocks.verifyCmsSessionToken.mockResolvedValueOnce({ userId: 7, sessionVersion: 2 });
    const refreshed = await createContext(options());
    expect(refreshed.user).toMatchObject({ id: 7, role: "content_manager", sessionVersion: 2 });
  });
});
