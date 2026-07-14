import { describe, expect, it } from "vitest";
import {
  createCmsSessionToken,
  createOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  isStrongPassword,
  normalizeEmail,
  verifyCmsSessionToken,
  verifyPassword,
} from "./cmsAuth";

describe("CMS authentication primitives", () => {
  it("normalizes email addresses consistently", () => {
    expect(normalizeEmail("  Editor@Example.COM ")).toBe("editor@example.com");
  });

  it("requires long mixed-complexity passwords", () => {
    expect(isStrongPassword("shortA1!")).toBe(false);
    expect(isStrongPassword("alllowercase123!")).toBe(false);
    expect(isStrongPassword("NoNumbersOrSymbols")).toBe(false);
    expect(isStrongPassword("Secure CMS 2026!")).toBe(true);
  });

  it("hashes passwords with Argon2 and verifies without exposing the password", async () => {
    const password = "Secure CMS 2026!";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, "Incorrect password 2026!")).resolves.toBe(false);
  });

  it("creates high-entropy opaque tokens and deterministic SHA-256 token hashes", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(first).not.toBe(second);
    expect(hashOpaqueToken(first)).toHaveLength(64);
    expect(hashOpaqueToken(first)).toBe(hashOpaqueToken(first));
    expect(hashOpaqueToken(first)).not.toBe(hashOpaqueToken(second));
  });

  it("issues and verifies CMS session JWTs with the user session version", async () => {
    const token = await createCmsSessionToken({ userId: 42, sessionVersion: 7 }, false);
    await expect(verifyCmsSessionToken(token)).resolves.toMatchObject({ userId: 42, sessionVersion: 7 });
    await expect(verifyCmsSessionToken(`${token}tampered`)).resolves.toBeNull();
  });
});
