import { and, asc, count, desc, eq, gt, isNull, lte, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import {
  articles,
  inquiries,
  inquiryResponses,
  InsertArticle,
  InsertInquiry,
  InsertInquiryResponse,
  InsertProjectImport,
  InsertProjectLocation,
  InsertUser,
  projectImports,
  projectLocations,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

function createCloudSqlDatabase() {
  if (!ENV.dbUser || !ENV.dbName) return null;

  const connectionLimit = Number.isFinite(ENV.dbPoolLimit)
    ? Math.max(1, Math.min(ENV.dbPoolLimit, 20))
    : 5;
  const pool = createPool({
    host: ENV.dbSocketPath ? undefined : ENV.dbHost,
    port: ENV.dbSocketPath ? undefined : ENV.dbPort,
    socketPath: ENV.dbSocketPath || undefined,
    user: ENV.dbUser,
    password: ENV.dbPassword,
    database: ENV.dbName,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  return drizzle(pool);
}

// Lazily create the Drizzle client so local tooling can run without a database.
// Google Cloud deployments use a Cloud SQL Unix socket and a bounded pool;
// existing environments can continue to provide DATABASE_URL.
export async function getDb() {
  if (_db) return _db;

  try {
    _db = createCloudSqlDatabase();
    if (!_db && ENV.databaseUrl) {
      _db = drizzle(ENV.databaseUrl);
    }
  } catch (error) {
    console.warn("[Database] Failed to initialize:", error);
    _db = null;
  }

  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createInquiry(input: InsertInquiry) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const result = await db.insert(inquiries).values(input).$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Inquiry could not be created");
  return id;
}

export async function updateInquiryNotificationStatus(
  id: number,
  notificationStatus: "sent" | "failed",
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db.update(inquiries).set({ notificationStatus }).where(eq(inquiries.id, id));
}

export async function listInquiries() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(inquiries).orderBy(desc(inquiries.createdAt), desc(inquiries.id));
}

export async function getInquiryById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const records = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
  const inquiry = records[0];
  if (!inquiry) return null;
  const responses = await db
    .select()
    .from(inquiryResponses)
    .where(eq(inquiryResponses.inquiryId, id))
    .orderBy(asc(inquiryResponses.createdAt), asc(inquiryResponses.id));
  return { inquiry, responses };
}

export async function updateInquiryStatus(id: number, status: "new" | "contacted" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(inquiries).set({ status }).where(eq(inquiries.id, id));
}

export async function createInquiryResponse(input: InsertInquiryResponse) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(inquiryResponses).values(input).$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Inquiry response could not be created");
  return id;
}

export async function updateInquiryResponseDelivery(input: {
  id: number;
  deliveryStatus: "sent" | "failed";
  providerMessageId?: string | null;
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(inquiryResponses).set({
    deliveryStatus: input.deliveryStatus,
    providerMessageId: input.providerMessageId ?? null,
    errorMessage: input.errorMessage ?? null,
    sentAt: input.deliveryStatus === "sent" ? new Date() : null,
  }).where(eq(inquiryResponses.id, input.id));
}

export async function markInquiryResponded(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(inquiries).set({ status: "contacted", lastRespondedAt: new Date() }).where(eq(inquiries.id, id));
}

export async function countRecentInquiriesByEmail(email: string, since: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const rows = await db
    .select({ value: count() })
    .from(inquiries)
    .where(and(eq(inquiries.email, email), gt(inquiries.createdAt, since)));

  return rows[0]?.value ?? 0;
}

export async function listPublishedArticles() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  return db
    .select()
    .from(articles)
    .where(and(
      eq(articles.status, "published"),
      or(isNull(articles.publishedAt), lte(articles.publishedAt, now)),
    ))
    .orderBy(desc(articles.publishedAt), desc(articles.id));
}

export async function getPublishedArticleByPath(path: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  const rows = await db
    .select()
    .from(articles)
    .where(and(
      eq(articles.path, path),
      eq(articles.status, "published"),
      or(isNull(articles.publishedAt), lte(articles.publishedAt, now)),
    ))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAllArticles() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(articles).orderBy(desc(articles.updatedAt), desc(articles.id));
}

export async function findArticleUrlConflict(input: { path: string; slug: string; excludeId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const urlMatch = or(eq(articles.path, input.path), eq(articles.slug, input.slug));
  const rows = await db
    .select({ id: articles.id, path: articles.path, slug: articles.slug })
    .from(articles)
    .where(input.excludeId ? and(urlMatch, ne(articles.id, input.excludeId)) : urlMatch)
    .limit(1);
  return rows[0] ?? null;
}

export async function createArticle(input: InsertArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(articles).values(input).$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Article could not be created");
  return id;
}

export async function updateArticle(id: number, input: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(articles).set(input).where(eq(articles.id, id));
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(articles).where(eq(articles.id, id));
}

export async function listActiveProjectLocations() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db
    .select({
      id: projectLocations.id,
      address: projectLocations.address,
      city: projectLocations.city,
      state: projectLocations.state,
      zip: projectLocations.zip,
      label: projectLocations.label,
      latitude: projectLocations.latitude,
      longitude: projectLocations.longitude,
    })
    .from(projectLocations)
    .where(eq(projectLocations.isActive, true))
    .orderBy(asc(projectLocations.city), asc(projectLocations.address), asc(projectLocations.id));
}

export async function listProjectLocations() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db
    .select()
    .from(projectLocations)
    .orderBy(desc(projectLocations.updatedAt), desc(projectLocations.id));
}

export async function listProjectImports() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db
    .select()
    .from(projectImports)
    .orderBy(desc(projectImports.createdAt), desc(projectImports.id));
}

export async function createProjectImport(input: InsertProjectImport) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const result = await db.insert(projectImports).values(input).$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Project import could not be created");
  return id;
}

export async function createProjectLocations(input: InsertProjectLocation[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.length === 0) return;

  await db.insert(projectLocations).values(input);
}

export async function updateProjectImport(
  id: number,
  input: Partial<Pick<InsertProjectImport, "importedCount" | "skippedCount" | "status" | "errorSummary">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db.update(projectImports).set(input).where(eq(projectImports.id, id));
}

export async function updateProjectLocation(
  id: number,
  input: Partial<Pick<InsertProjectLocation, "address" | "city" | "state" | "zip" | "label" | "latitude" | "longitude" | "isActive">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db.update(projectLocations).set(input).where(eq(projectLocations.id, id));
}

export async function deleteProjectLocation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db.delete(projectLocations).where(eq(projectLocations.id, id));
}
