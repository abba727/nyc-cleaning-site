import { describe, expect, it } from "vitest";

import {
  createCmsSessionToken,
  createOpaqueToken,
  generateVerificationCode,
  hashOpaqueToken,
  hashPassword,
  hashVerificationCode,
  isStrongPassword,
  normalizeEmail,
  verifyCmsSessionToken,
  verifyCodeConstantTime,
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

  it("generates exactly six numeric digits, including leading-zero-compatible output", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateVerificationCode()).toMatch(/^\d{6}$/);
    }
  });

  it("stores only a keyed code hash bound to purpose and normalized email", () => {
    const code = "042817";
    const invitationHash = hashVerificationCode(code, "invitation", " Editor@Example.COM ");
    expect(invitationHash).toMatch(/^[a-f0-9]{64}$/);
    expect(invitationHash).not.toContain(code);
    expect(invitationHash).toBe(hashVerificationCode(code, "invitation", "editor@example.com"));
    expect(invitationHash).not.toBe(hashVerificationCode(code, "password_reset", "editor@example.com"));
    expect(invitationHash).not.toBe(hashVerificationCode(code, "invitation", "other@example.com"));
  });

  it("verifies the correct code without accepting wrong, cross-purpose, or cross-account values", () => {
    const storedHash = hashVerificationCode("718204", "password_reset", "editor@example.com");
    expect(verifyCodeConstantTime({ code: "718204", storedHash, purpose: "password_reset", subject: "EDITOR@example.com" })).toBe(true);
    expect(verifyCodeConstantTime({ code: "718205", storedHash, purpose: "password_reset", subject: "editor@example.com" })).toBe(false);
    expect(verifyCodeConstantTime({ code: "718204", storedHash, purpose: "invitation", subject: "editor@example.com" })).toBe(false);
    expect(verifyCodeConstantTime({ code: "718204", storedHash, purpose: "password_reset", subject: "other@example.com" })).toBe(false);
    expect(verifyCodeConstantTime({ code: "718204", storedHash: "malformed", purpose: "password_reset", subject: "editor@example.com" })).toBe(false);
  });

  it("issues and verifies CMS session JWTs with the user session version", async () => {
    const token = await createCmsSessionToken({ userId: 42, sessionVersion: 7 }, false);
    await expect(verifyCmsSessionToken(token)).resolves.toMatchObject({ userId: 42, sessionVersion: 7 });
    await expect(verifyCmsSessionToken(`${token}tampered`)).resolves.toBeNull();
  });
});
