import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export type ArticleBlock = {
  type: "h2" | "h3" | "p" | "li";
  text: string;
};

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "content_manager"]).default("content_manager").notNull(),
  isPrimaryAdmin: boolean("isPrimaryAdmin").default(false).notNull(),
  roleChangedAt: timestamp("roleChangedAt"),
  roleChangedByUserId: int("roleChangedByUserId"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const cmsCredentials = mysqlTable("cmsCredentials", {
  userId: int("userId").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash"),
  sessionVersion: int("sessionVersion").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "active", "disabled"]).default("pending").notNull(),
  passwordChangedAt: timestamp("passwordChangedAt"),
  lastSignedInAt: timestamp("lastSignedInAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsCredential = typeof cmsCredentials.$inferSelect;
export type InsertCmsCredential = typeof cmsCredentials.$inferInsert;

export const cmsInvitations = mysqlTable("cmsInvitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "content_manager"]).notNull(),
  codeHash: varchar("codeHash", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).default("pending").notNull(),
  invitedByUserId: int("invitedByUserId").notNull(),
  acceptedByUserId: int("acceptedByUserId"),
  expiresAt: timestamp("expiresAt").notNull(),
  lastSentAt: timestamp("lastSentAt").defaultNow().notNull(),
  sendCount: int("sendCount").default(1).notNull(),
  attemptCount: int("attemptCount").default(0).notNull(),
  resendAvailableAt: timestamp("resendAvailableAt"),
  acceptedAt: timestamp("acceptedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CmsInvitation = typeof cmsInvitations.$inferSelect;
export type InsertCmsInvitation = typeof cmsInvitations.$inferInsert;

export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  codeHash: varchar("codeHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  attemptCount: int("attemptCount").default(0).notNull(),
  resendAvailableAt: timestamp("resendAvailableAt"),
  lastSentAt: timestamp("lastSentAt").defaultNow().notNull(),
  sendCount: int("sendCount").default(1).notNull(),
  usedAt: timestamp("usedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export const authAuditEvents = mysqlTable("authAuditEvents", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  targetUserId: int("targetUserId"),
  targetEmail: varchar("targetEmail", { length: 320 }),
  action: mysqlEnum("action", [
    "invited",
    "invitation_resent",
    "invitation_revoked",
    "registered",
    "password_reset_requested",
    "password_reset_completed",
    "role_changed",
    "user_removed",
    "user_restored",
    "login_succeeded",
    "login_failed",
  ]).notNull(),
  oldRole: mysqlEnum("oldRole", ["admin", "content_manager"]),
  newRole: mysqlEnum("newRole", ["admin", "content_manager"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuthAuditEvent = typeof authAuditEvents.$inferSelect;
export type InsertAuthAuditEvent = typeof authAuditEvents.$inferInsert;

export const inquiries = mysqlTable("inquiries", {
  id: int("id").autoincrement().primaryKey(),
  inquiryType: mysqlEnum("inquiryType", ["contact", "quote"]).default("quote").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 48 }).notNull(),
  serviceType: varchar("serviceType", { length: 160 }).notNull(),
  message: text("message").notNull(),
  sourcePath: varchar("sourcePath", { length: 512 }).notNull(),
  status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
  notificationStatus: mysqlEnum("notificationStatus", ["pending", "sent", "failed"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = typeof inquiries.$inferInsert;

export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  path: varchar("path", { length: 512 }).notNull().unique(),
  slug: varchar("slug", { length: 512 }),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt"),
  description: text("description").notNull(),
  blocks: json("blocks").$type<ArticleBlock[]>().notNull(),
  body: json("body").$type<ArticleBlock[]>(),
  seoTitle: varchar("seoTitle", { length: 512 }),
  metaDescription: text("metaDescription"),
  coverImageUrl: text("coverImageUrl").notNull(),
  coverImageKey: text("coverImageKey"),
  coverImageAlt: varchar("coverImageAlt", { length: 512 }).notNull(),
  sourceUrl: text("sourceUrl"),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  authorName: varchar("authorName", { length: 255 }),
  createdByOpenId: varchar("createdByOpenId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;
