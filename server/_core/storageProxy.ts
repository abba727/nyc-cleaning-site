import { Storage } from "@google-cloud/storage";
import type { Express, Request, Response } from "express";
import { ENV } from "./env";

let googleStorage: Storage | null = null;

const VERSIONED_MEDIA_PATTERN = /[_-][a-f0-9]{8,}(?:[-_]\d+w)?\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i;
const LEGACY_MEDIA_PATH_PREFIX = "/manus-storage/";
const PUBLIC_MEDIA_PATH_PREFIX = "/media/";

function getGoogleStorage() {
  googleStorage ??= new Storage();
  return googleStorage;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: number }).code === 404
  );
}

function getStorageKey(req: Request): string | null {
  const rawKey = (req.params as Record<string, string>)[0] || "";
  const key = rawKey.replace(/^\/+/, "");
  if (!key || key.split("/").some(part => part === "." || part === "..")) return null;
  return key;
}

function publicMediaPath(key: string): string {
  const encodedKey = key.split("/").map(segment => encodeURIComponent(segment)).join("/");
  return `${PUBLIC_MEDIA_PATH_PREFIX}${encodedKey}`;
}

function storageKeyCandidates(key: string): string[] {
  // Existing production assets were uploaded under assets/, while generated
  // images are stored at their canonical root key. Preserve both GCS layouts.
  return key.startsWith("assets/") ? [key] : [key, `assets/${key}`];
}

function cacheControlForAsset(key: string, metadataCacheControl?: string | null) {
  // Asset filenames contain a content/version hash. A deploy that changes an
  // image uses a new filename, which makes long-lived browser caching safe.
  if (VERSIONED_MEDIA_PATTERN.test(key)) {
    return "public, max-age=31536000, immutable";
  }

  return metadataCacheControl || "public, max-age=3600";
}

async function serveGoogleCloudObject(key: string, res: Response) {
  const bucket = getGoogleStorage().bucket(ENV.gcsBucket);

  for (const candidateKey of storageKeyCandidates(key)) {
    const file = bucket.file(candidateKey);

    try {
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Cache-Control": cacheControlForAsset(candidateKey, metadata.cacheControl),
      });
      if (metadata.etag) res.set("ETag", metadata.etag);
      file.createReadStream()
        .on("error", (error) => {
          console.error("[MediaProxy] GCS stream failed:", error);
          if (!res.headersSent) res.status(502).send("Storage proxy error");
          else res.destroy(error);
        })
        .pipe(res);
      return;
    } catch (error) {
      if (isNotFound(error)) continue;
      console.error("[MediaProxy] GCS read failed:", error);
      res.status(502).send("Storage backend error");
      return;
    }
  }

  res.status(404).send("Asset not found");
}

async function redirectToLegacyObject(key: string, res: Response) {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    res.status(500).send("Storage proxy not configured");
    return;
  }

  try {
    const forgeUrl = new URL(
      "v1/storage/presign/get",
      ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
    );
    forgeUrl.searchParams.set("path", key);

    const forgeResp = await fetch(forgeUrl, {
      headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
    });

    if (!forgeResp.ok) {
      const body = await forgeResp.text().catch(() => "");
      console.error(`[MediaProxy] legacy storage error: ${forgeResp.status} ${body}`);
      res.status(502).send("Storage backend error");
      return;
    }

    const { url } = (await forgeResp.json()) as { url: string };
    if (!url) {
      res.status(502).send("Empty signed URL from backend");
      return;
    }

    res.set("Cache-Control", "no-store");
    res.redirect(307, url);
  } catch (error) {
    console.error("[MediaProxy] legacy storage failed:", error);
    res.status(502).send("Storage proxy error");
  }
}

async function serveMedia(req: Request, res: Response) {
  const key = getStorageKey(req);
  if (!key) {
    res.status(400).send("Missing or invalid storage key");
    return;
  }

  if (ENV.gcsBucket) {
    await serveGoogleCloudObject(key, res);
    return;
  }

  await redirectToLegacyObject(key, res);
}

export function registerStorageProxy(app: Express) {
  // Canonical application-owned image URL. In production it is served only
  // through the configured Google Cloud Storage bucket.
  app.get("/media/*", serveMedia);

  // Preserve old database, crawler, and externally shared URLs without
  // continuing to expose the legacy provider name in new page source.
  app.get("/manus-storage/*", (req, res) => {
    const key = getStorageKey(req);
    if (!key) {
      res.status(400).send("Missing or invalid storage key");
      return;
    }

    res.set("Cache-Control", "public, max-age=86400");
    res.redirect(308, publicMediaPath(key));
  });
}
