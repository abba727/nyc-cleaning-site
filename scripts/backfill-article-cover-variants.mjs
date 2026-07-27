import { Storage } from "@google-cloud/storage";
import { createPool } from "mysql2/promise";
import sharp from "sharp";

const VARIANT_WIDTHS = [480, 800, 1200];
const VARIANT_FORMATS = ["avif", "webp"];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured`);
  return value;
}

function connectionOptions() {
  const socketPath = process.env.MYSQL_UNIX_SOCKET?.trim();
  return {
    host: socketPath ? undefined : (process.env.DB_HOST || "127.0.0.1"),
    port: socketPath ? undefined : Number.parseInt(process.env.DB_PORT || "3306", 10),
    socketPath: socketPath || undefined,
    user: required("DB_USER"),
    password: process.env.DB_PASS || "",
    database: required("DB_NAME"),
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  };
}

function mediaKeyFromUrl(value) {
  try {
    const path = new URL(value, "https://www.nyccleaning.co").pathname;
    const match = path.match(/^\/(?:media|manus-storage)\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function sourceCandidates(key) {
  return key.startsWith("assets/") ? [key] : [key, `assets/${key}`];
}

function variantKey(sourceKey, width, format) {
  const index = sourceKey.lastIndexOf(".");
  if (index <= 0) throw new Error(`Cover key has no usable extension: ${sourceKey}`);
  return `${sourceKey.slice(0, index)}-${width}w.${format}`;
}

async function makeVariant(source, width, format) {
  const pipeline = sharp(source, { failOn: "warning" })
    .rotate()
    .resize({ width, fit: "inside", withoutEnlargement: true });

  return format === "avif"
    ? pipeline.avif({ quality: 50, effort: 6, chromaSubsampling: "4:2:0" }).toBuffer()
    : pipeline.webp({ quality: 78, effort: 5, smartSubsample: true }).toBuffer();
}

async function backfill() {
  const bucketName = process.env.GCS_BUCKET?.trim();
  if (!bucketName) {
    console.log("[article-cover-backfill] no GCS_BUCKET configured; skipping responsive cover backfill");
    return;
  }

  const pool = createPool(connectionOptions());
  const bucket = new Storage().bucket(bucketName);
  let scanned = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const [rows] = await pool.query(
      `SELECT id, coverImageUrl, coverImageKey
       FROM articles
       WHERE coverImageUrl IS NOT NULL AND coverImageUrl <> ''`,
    );

    for (const row of rows) {
      const sourceKey = row.coverImageKey || mediaKeyFromUrl(row.coverImageUrl);
      if (!sourceKey || !/^(?:generated|article-covers)\//.test(sourceKey)) {
        skipped += 1;
        continue;
      }

      scanned += 1;
      try {
        let sourceFile = null;
        for (const candidate of sourceCandidates(sourceKey)) {
          const file = bucket.file(candidate);
          const [exists] = await file.exists();
          if (exists) {
            sourceFile = file;
            break;
          }
        }
        if (!sourceFile) throw new Error(`Original object not found for ${sourceKey}`);

        const variants = VARIANT_WIDTHS.flatMap(width => VARIANT_FORMATS.map(format => ({
          width,
          format,
          key: variantKey(sourceKey, width, format),
        })));
        const missing = [];
        for (const variant of variants) {
          let exists = false;
          for (const candidate of sourceCandidates(variant.key)) {
            const [candidateExists] = await bucket.file(candidate).exists();
            if (candidateExists) {
              exists = true;
              break;
            }
          }
          if (!exists) missing.push(variant);
        }
        if (missing.length === 0) continue;

        const [source] = await sourceFile.download();
        for (const variant of missing) {
          const data = await makeVariant(source, variant.width, variant.format);
          await bucket.file(variantKey(sourceFile.name, variant.width, variant.format)).save(data, {
            resumable: false,
            contentType: `image/${variant.format}`,
            metadata: { cacheControl: "public, max-age=31536000, immutable" },
          });
          created += 1;
        }
      } catch (error) {
        failed += 1;
        console.warn("[article-cover-backfill] unable to optimize article cover", {
          articleId: row.id,
          sourceKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await pool.end();
  }

  console.log(`[article-cover-backfill] scanned ${scanned}, created ${created} variants, skipped ${skipped}, failed ${failed}`);
}

backfill().catch(error => {
  console.error("[article-cover-backfill] failed", error);
  process.exitCode = 1;
});
