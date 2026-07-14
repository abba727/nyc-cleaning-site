import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCmsUserById: vi.fn(),
}));

vi.mock("./cmsDb", () => ({
  getCmsUserById: mocks.getCmsUserById,
}));

import { COOKIE_NAME } from "@shared/const";
import { createCmsSessionToken } from "./cmsAuth";
import { createContext } from "./_core/context";

describe("CMS login session persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authenticates the request immediately following login from its raw Cookie header", async () => {
    mocks.getCmsUserById.mockResolvedValue({
      id: 41,
      openId: "cms:41",
      name: "Primary Administrator",
      email: "admin@example.com",
      role: "admin",
      isPrimaryAdmin: true,
      sessionVersion: 3,
    });
    const token = await createCmsSessionToken({ userId: 41, sessionVersion: 3 }, true);

    const context = await createContext({
      req: {
        headers: { cookie: `other=value; ${COOKIE_NAME}=${token}` },
      },
      res: {},
    } as Parameters<typeof createContext>[0]);

    expect(mocks.getCmsUserById).toHaveBeenCalledWith(41);
    expect(context.user).toMatchObject({
      id: 41,
      email: "admin@example.com",
      role: "admin",
      isPrimaryAdmin: true,
      sessionVersion: 3,
    });
  });
});
