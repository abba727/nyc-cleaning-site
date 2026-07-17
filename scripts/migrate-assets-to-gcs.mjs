import fs from "node:fs/promises";
import path from "node:path";
import { Storage } from "@google-cloud/storage";
import mysql from "mysql2/promise";

const dryRun = /^(?:1|true|yes)$/i.test(process.env.DRY_RUN || "");
const bucketName = process.env.GCS_BUCKET?.trim();
if (!bucketName && !dryRun) throw new Error("GCS_BUCKET must be configured");

const sourceBaseUrl = (process.env.SOURCE_BASE_URL || "https://www.nyccleaning.co").replace(/\/$/, "");
const storage = new Storage();
const bucket = bucketName ? storage.bucket(bucketName) : null;
const keys = new Set();

function collectKeys(content) {
  const pattern = /\/manus-storage\/([^"'`()\s,<>{}]+)/g;
  for (const match of content.matchAll(pattern)) {
    const key = match[1]?.replace(/[?#].*$/, "");
    if (key) keys.add(key);
  }
}

async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (/\.(?:ts|tsx|js|mjs|json|md)$/.test(entry.name)) {
      collectKeys(await fs.readFile(fullPath, "utf8"));
    }
  }
}

function databaseOptions() {
  if (!process.env.DB_USER || !process.env.DB_NAME) return null;
  const socketPath = process.env.MYSQL_UNIX_SOCKET?.trim();
  return {
    host: socketPath ? undefined : (process.env.DB_HOST || "127.0.0.1"),
    port: socketPath ? undefined : Number.parseInt(process.env.DB_PORT || "3306", 10),
    socketPath: socketPath || undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME,
  };
}

async function collectDatabaseKeys() {
  const options = databaseOptions();
  if (!options) return;

  const connection = await mysql.createConnection(options);
  try {
    const [rows] = await connection.query(
      "SELECT coverImageUrl FROM articles WHERE coverImageUrl LIKE '/manus-storage/%'",
    );
    for (const row of rows) collectKeys(row.coverImageUrl || "");
  } finally {
    await connection.end();
  }
}

await walk(path.resolve(process.cwd(), "client", "src"));
await collectDatabaseKeys();

if (dryRun) {
  for (const key of [...keys].sort()) console.log(`[assets] would copy: ${key}`);
  console.log(`[assets] dry run complete: discovered=${keys.size} source=${sourceBaseUrl}`);
  process.exit(0);
}

let copied = 0;
let skipped = 0;
let failed = 0;

for (const key of [...keys].sort()) {
  const target = bucket.file(key);
  const [exists] = await target.exists();
  if (exists) {
    skipped += 1;
    console.log(`[assets] already exists: ${key}`);
    continue;
  }

  const sourceUrl = `${sourceBaseUrl}/manus-storage/${key}`;
  try {
    const response = await fetch(sourceUrl, { redirect: "follow" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    await target.save(data, {
      resumable: false,
      contentType: response.headers.get("content-type") || "application/octet-stream",
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });
    copied += 1;
    console.log(`[assets] copied: ${key}`);
  } catch (error) {
    failed += 1;
    console.error(`[assets] failed: ${key}:`, error);
  }
}

console.log(`[assets] complete: copied=${copied} skipped=${skipped} failed=${failed}`);
if (failed > 0) process.exitCode = 1;
