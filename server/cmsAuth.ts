import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { jwtVerify, SignJWT } from "jose";
import { isCmsPasswordStrong } from "@shared/cmsPassword";
import { ENV } from "./_core/env";

export const CMS_SESSION_KIND = "nyc-cleaning-cms";
export const CMS_SESSION_MS = 3 * 60 * 60 * 1000;
export const SHORT_SESSION_MS = CMS_SESSION_MS;
export const REMEMBER_SESSION_MS = CMS_SESSION_MS;
export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
export const INVITATION_TTL_MS = VERIFICATION_CODE_TTL_MS;
export const RESET_TTL_MS = VERIFICATION_CODE_TTL_MS;
export const CODE_RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export type VerificationCodePurpose = "invitation" | "password_reset";

export type CmsSessionClaims = {
  userId: number;
  sessionVersion: number;
};

function sessionSecret() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function verificationCodeKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required");
  return ENV.cookieSecret;
}

export function hashVerificationCode(
  code: string,
  purpose: VerificationCodePurpose,
  subject: string,
) {
  return createHmac("sha256", verificationCodeKey())
    .update(`${purpose}:${normalizeEmail(subject)}:${code}`)
    .digest("hex");
}

export function verifyCodeConstantTime(input: {
  code: string;
  storedHash: string;
  purpose: VerificationCodePurpose;
  subject: string;
}) {
  const expected = Buffer.from(
    hashVerificationCode(input.code, input.purpose, input.subject),
    "hex",
  );
  const stored = Buffer.from(input.storedHash, "hex");
  return expected.length === stored.length && timingSafeEqual(expected, stored);
}

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function createCmsSessionToken(
  claims: CmsSessionClaims,
  _rememberMe: boolean,
) {
  const now = Date.now();
  return new SignJWT({
    kind: CMS_SESSION_KIND,
    sv: claims.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(claims.userId))
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor((now + CMS_SESSION_MS) / 1000))
    .sign(sessionSecret());
}

export async function verifyCmsSessionToken(token: string | undefined | null): Promise<CmsSessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    const sessionVersion = Number(payload.sv);
    if (payload.kind !== CMS_SESSION_KIND || !Number.isInteger(userId) || userId <= 0 || !Number.isInteger(sessionVersion)) {
      return null;
    }
    return { userId, sessionVersion };
  } catch {
    return null;
  }
}

export function isStrongPassword(password: string) {
  return isCmsPasswordStrong(password);
}
