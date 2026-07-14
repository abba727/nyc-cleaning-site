import { createHash } from "node:crypto";
import { and, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import {
  authAuditEvents,
  cmsCredentials,
  cmsInvitations,
  passwordResetTokens,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  createOpaqueToken,
  hashOpaqueToken,
  INVITATION_TTL_MS,
  normalizeEmail,
  RESET_TTL_MS,
} from "./cmsAuth";
import { ENV } from "./_core/env";

export type CmsRole = "admin" | "content_manager";

function localOpenId(email: string) {
  return `cms:${createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 58)}`;
}

export async function getCmsUserById(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: cmsCredentials.email,
      role: users.role,
      isPrimaryAdmin: users.isPrimaryAdmin,
      deletedAt: users.deletedAt,
      sessionVersion: cmsCredentials.sessionVersion,
      credentialStatus: cmsCredentials.status,
    })
    .from(users)
    .innerJoin(cmsCredentials, eq(cmsCredentials.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user || user.deletedAt || user.credentialStatus !== "active") return null;
  if (user.role !== "admin" && user.role !== "content_manager") return null;
  return { ...user, role: user.role as CmsRole };
}

export async function getCredentialByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      role: users.role,
      isPrimaryAdmin: users.isPrimaryAdmin,
      deletedAt: users.deletedAt,
      email: cmsCredentials.email,
      passwordHash: cmsCredentials.passwordHash,
      sessionVersion: cmsCredentials.sessionVersion,
      status: cmsCredentials.status,
    })
    .from(cmsCredentials)
    .innerJoin(users, eq(users.id, cmsCredentials.userId))
    .where(eq(cmsCredentials.email, normalizeEmail(email)))
    .limit(1);
  return rows[0] ?? null;
}

export async function recordLoginResult(input: { userId?: number; email: string; success: boolean }) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  if (input.success && input.userId) {
    await db.update(cmsCredentials).set({ lastSignedInAt: now }).where(eq(cmsCredentials.userId, input.userId));
    await db.update(users).set({ lastSignedIn: now }).where(eq(users.id, input.userId));
  }
  await db.insert(authAuditEvents).values({
    actorUserId: input.userId ?? null,
    targetUserId: input.userId ?? null,
    targetEmail: normalizeEmail(input.email),
    action: input.success ? "login_succeeded" : "login_failed",
  });
}

export async function createInvitation(input: { email: string; role: CmsRole; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const email = normalizeEmail(input.email);
  const existing = await getCredentialByEmail(email);
  if (existing && !existing.deletedAt && existing.status === "active") throw new Error("USER_ALREADY_ACTIVE");

  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);
  await db.transaction(async tx => {
    await tx
      .update(cmsInvitations)
      .set({ status: "revoked", revokedAt: now })
      .where(and(eq(cmsInvitations.email, email), eq(cmsInvitations.status, "pending")));
    await tx.insert(cmsInvitations).values({
      email,
      role: input.role,
      tokenHash,
      invitedByUserId: input.actorUserId,
      expiresAt,
      lastSentAt: now,
    });
    await tx.insert(authAuditEvents).values({
      actorUserId: input.actorUserId,
      targetUserId: existing?.userId ?? null,
      targetEmail: email,
      action: "invited",
      newRole: input.role,
    });
  });
  return { token, email, role: input.role, expiresAt };
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(cmsInvitations)
    .where(eq(cmsInvitations.tokenHash, hashOpaqueToken(token)))
    .limit(1);
  const invitation = rows[0];
  if (!invitation || invitation.status !== "pending") return null;
  if (invitation.expiresAt <= new Date()) {
    await db.update(cmsInvitations).set({ status: "expired" }).where(eq(cmsInvitations.id, invitation.id));
    return null;
  }
  return invitation;
}

export async function acceptInvitation(input: { token: string; name: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const tokenHash = hashOpaqueToken(input.token);
  const invitation = await getInvitationByToken(input.token);
  if (!invitation) throw new Error("INVALID_INVITATION");
  const now = new Date();
  let acceptedUserId = 0;

  await db.transaction(async tx => {
    const currentRows = await tx
      .select()
      .from(cmsInvitations)
      .where(and(eq(cmsInvitations.id, invitation.id), eq(cmsInvitations.tokenHash, tokenHash), eq(cmsInvitations.status, "pending"), gt(cmsInvitations.expiresAt, now)))
      .limit(1);
    if (!currentRows[0]) throw new Error("INVALID_INVITATION");

    const credentialRows = await tx
      .select({ userId: cmsCredentials.userId })
      .from(cmsCredentials)
      .where(eq(cmsCredentials.email, invitation.email))
      .limit(1);
    acceptedUserId = credentialRows[0]?.userId ?? 0;
    if (!acceptedUserId) {
      const userResult = await tx.insert(users).values({
        openId: localOpenId(invitation.email),
        email: invitation.email,
        name: input.name.trim(),
        loginMethod: "password",
        role: invitation.role,
        isPrimaryAdmin: normalizeEmail(invitation.email) === normalizeEmail(ENV.primaryAdminEmail),
        lastSignedIn: now,
      }).$returningId();
      acceptedUserId = userResult[0]?.id ?? 0;
      if (!acceptedUserId) throw new Error("USER_CREATION_FAILED");
      await tx.insert(cmsCredentials).values({
        userId: acceptedUserId,
        email: invitation.email,
        passwordHash: input.passwordHash,
        status: "active",
        passwordChangedAt: now,
      });
    } else {
      await tx.update(users).set({
        name: input.name.trim(),
        email: invitation.email,
        role: invitation.role,
        loginMethod: "password",
        deletedAt: null,
      }).where(eq(users.id, acceptedUserId));
      await tx.update(cmsCredentials).set({
        passwordHash: input.passwordHash,
        status: "active",
        passwordChangedAt: now,
        sessionVersion: 1,
      }).where(eq(cmsCredentials.userId, acceptedUserId));
    }
    await tx.update(cmsInvitations).set({
      status: "accepted",
      acceptedByUserId: acceptedUserId,
      acceptedAt: now,
    }).where(and(eq(cmsInvitations.id, invitation.id), eq(cmsInvitations.status, "pending")));
    await tx.update(cmsInvitations).set({ status: "revoked", revokedAt: now })
      .where(and(eq(cmsInvitations.email, invitation.email), eq(cmsInvitations.status, "pending"), ne(cmsInvitations.id, invitation.id)));
    await tx.insert(authAuditEvents).values({
      actorUserId: acceptedUserId,
      targetUserId: acceptedUserId,
      targetEmail: invitation.email,
      action: "registered",
      newRole: invitation.role,
    });
  });
  const user = await getCmsUserById(acceptedUserId);
  if (!user) throw new Error("USER_CREATION_FAILED");
  return user;
}

export async function createPasswordReset(emailInput: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const email = normalizeEmail(emailInput);
  const credential = await getCredentialByEmail(email);
  if (!credential || credential.deletedAt || credential.status !== "active" || !credential.passwordHash) return null;
  const token = createOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS);
  await db.transaction(async tx => {
    await tx.update(passwordResetTokens).set({ revokedAt: now })
      .where(and(eq(passwordResetTokens.userId, credential.userId), isNull(passwordResetTokens.usedAt), isNull(passwordResetTokens.revokedAt)));
    await tx.insert(passwordResetTokens).values({ userId: credential.userId, tokenHash: hashOpaqueToken(token), expiresAt });
    await tx.insert(authAuditEvents).values({
      actorUserId: credential.userId,
      targetUserId: credential.userId,
      targetEmail: email,
      action: "password_reset_requested",
    });
  });
  return { token, email, expiresAt };
}

export async function createPrimaryAdminSetup(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (email !== normalizeEmail(ENV.primaryAdminEmail)) return null;
  const credential = await ensurePrimaryAdminAccount();
  if (credential.deletedAt || !credential.isPrimaryAdmin) return null;
  if (credential.status === "active" || credential.passwordHash) return null;
  return createInvitation({ email, role: "admin", actorUserId: credential.userId });
}

export async function completePasswordReset(input: { token: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  const rows = await db.select().from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, hashOpaqueToken(input.token)), isNull(passwordResetTokens.usedAt), isNull(passwordResetTokens.revokedAt), gt(passwordResetTokens.expiresAt, now)))
    .limit(1);
  const reset = rows[0];
  if (!reset) throw new Error("INVALID_RESET");
  await db.transaction(async tx => {
    await tx.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.id, reset.id), isNull(passwordResetTokens.usedAt)));
    await tx.update(cmsCredentials).set({
      passwordHash: input.passwordHash,
      passwordChangedAt: now,
      sessionVersion: sql`${cmsCredentials.sessionVersion} + 1`,
    }).where(eq(cmsCredentials.userId, reset.userId));
    await tx.update(passwordResetTokens).set({ revokedAt: now })
      .where(and(eq(passwordResetTokens.userId, reset.userId), isNull(passwordResetTokens.usedAt), isNull(passwordResetTokens.revokedAt)));
    await tx.insert(authAuditEvents).values({ actorUserId: reset.userId, targetUserId: reset.userId, action: "password_reset_completed" });
  });
}

export async function listCmsUsersAndInvitations() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [userRows, invitationRows] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: cmsCredentials.email,
      role: users.role,
      isPrimaryAdmin: users.isPrimaryAdmin,
      status: cmsCredentials.status,
      lastSignedInAt: cmsCredentials.lastSignedInAt,
      createdAt: users.createdAt,
    }).from(users).innerJoin(cmsCredentials, eq(cmsCredentials.userId, users.id)).where(isNull(users.deletedAt)).orderBy(desc(users.isPrimaryAdmin), users.name),
    db.select().from(cmsInvitations).where(eq(cmsInvitations.status, "pending")).orderBy(desc(cmsInvitations.createdAt)),
  ]);
  return {
    users: userRows.filter(row => row.role === "admin" || row.role === "content_manager"),
    invitations: invitationRows.map(({ tokenHash: _tokenHash, ...invitation }) => invitation),
  };
}

export async function changeCmsUserRole(input: { targetUserId: number; role: CmsRole; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(users).where(eq(users.id, input.targetUserId)).limit(1);
  const target = rows[0];
  if (!target || target.deletedAt) throw new Error("USER_NOT_FOUND");
  if (target.isPrimaryAdmin) throw new Error("PRIMARY_ADMIN_PROTECTED");
  const oldRole = target.role === "admin" ? "admin" : "content_manager";
  const now = new Date();
  await db.transaction(async tx => {
    await tx.update(users).set({ role: input.role, roleChangedAt: now, roleChangedByUserId: input.actorUserId }).where(eq(users.id, input.targetUserId));
    await tx.update(cmsCredentials).set({ sessionVersion: sql`${cmsCredentials.sessionVersion} + 1` }).where(eq(cmsCredentials.userId, input.targetUserId));
    await tx.insert(authAuditEvents).values({ actorUserId: input.actorUserId, targetUserId: input.targetUserId, action: "role_changed", oldRole, newRole: input.role });
  });
}

export async function removeCmsUser(input: { targetUserId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({ user: users, credential: cmsCredentials })
    .from(users).innerJoin(cmsCredentials, eq(cmsCredentials.userId, users.id)).where(eq(users.id, input.targetUserId)).limit(1);
  const target = rows[0];
  if (!target || target.user.deletedAt) throw new Error("USER_NOT_FOUND");
  if (target.user.isPrimaryAdmin) throw new Error("PRIMARY_ADMIN_PROTECTED");
  const now = new Date();
  await db.transaction(async tx => {
    await tx.update(users).set({ deletedAt: now }).where(eq(users.id, input.targetUserId));
    await tx.update(cmsCredentials).set({ status: "disabled", sessionVersion: sql`${cmsCredentials.sessionVersion} + 1` }).where(eq(cmsCredentials.userId, input.targetUserId));
    await tx.update(passwordResetTokens).set({ revokedAt: now }).where(and(eq(passwordResetTokens.userId, input.targetUserId), isNull(passwordResetTokens.usedAt), isNull(passwordResetTokens.revokedAt)));
    await tx.update(cmsInvitations).set({ status: "revoked", revokedAt: now }).where(and(eq(cmsInvitations.email, target.credential.email), eq(cmsInvitations.status, "pending")));
    await tx.insert(authAuditEvents).values({ actorUserId: input.actorUserId, targetUserId: input.targetUserId, targetEmail: target.credential.email, action: "user_removed" });
  });
}

export async function revokeInvitation(input: { invitationId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(cmsInvitations).where(eq(cmsInvitations.id, input.invitationId)).limit(1);
  const invitation = rows[0];
  if (!invitation || invitation.status !== "pending") throw new Error("INVITATION_NOT_FOUND");
  const now = new Date();
  await db.transaction(async tx => {
    await tx.update(cmsInvitations).set({ status: "revoked", revokedAt: now }).where(and(eq(cmsInvitations.id, input.invitationId), eq(cmsInvitations.status, "pending")));
    await tx.insert(authAuditEvents).values({ actorUserId: input.actorUserId, targetEmail: invitation.email, action: "invitation_revoked", newRole: invitation.role });
  });
}

export async function ensurePrimaryAdminAccount() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const email = normalizeEmail(ENV.primaryAdminEmail);
  let credential = await getCredentialByEmail(email);
  if (!credential) {
    const now = new Date();
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    let userId = existingUsers[0]?.id;
    if (!userId) {
      const result = await db.insert(users).values({
        openId: localOpenId(email),
        email,
        name: "Albert Aranbaev",
        loginMethod: "password",
        role: "admin",
        isPrimaryAdmin: true,
        roleChangedAt: now,
      }).$returningId();
      userId = result[0]?.id;
    } else {
      await db.update(users).set({
        loginMethod: "password",
        role: "admin",
        isPrimaryAdmin: true,
        deletedAt: null,
        roleChangedAt: now,
      }).where(eq(users.id, userId));
    }
    if (!userId) throw new Error("PRIMARY_ADMIN_CREATION_FAILED");
    await db.insert(cmsCredentials).values({ userId, email, status: "pending" });
  } else {
    await db.update(users).set({ role: "admin", isPrimaryAdmin: true, deletedAt: null }).where(eq(users.id, credential.userId));
  }
  credential = await getCredentialByEmail(email);
  if (!credential) throw new Error("PRIMARY_ADMIN_CREATION_FAILED");
  return credential;
}
