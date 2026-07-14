import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { verifyCmsSessionToken } from "../cmsAuth";
import { getCmsUserById, type CmsRole } from "../cmsDb";

export type CmsContextUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string;
  role: CmsRole;
  isPrimaryAdmin: boolean;
  sessionVersion: number;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: CmsContextUser | null;
};

function readBearerToken(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  const match = value?.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1];
}

async function verifyOptionalCmsSessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    return await verifyCmsSessionToken(token);
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: CmsContextUser | null = null;

  try {
    const requestCookies = opts.req.cookies ?? parseCookieHeader(opts.req.headers.cookie ?? "");
    const cookieClaims = await verifyOptionalCmsSessionToken(requestCookies[COOKIE_NAME]);
    const claims = cookieClaims
      ?? await verifyOptionalCmsSessionToken(readBearerToken(opts.req.headers.authorization));
    if (claims) {
      const current = await getCmsUserById(claims.userId);
      if (current && current.sessionVersion === claims.sessionVersion) {
        user = {
          id: current.id,
          openId: current.openId,
          name: current.name,
          email: current.email,
          role: current.role,
          isPrimaryAdmin: current.isPrimaryAdmin,
          sessionVersion: current.sessionVersion,
        };
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
