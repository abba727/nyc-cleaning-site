import { Storage } from "@google-cloud/storage";
import type { Express, Response } from "express";
import { ENV } from "./env";

let googleStorage: Storage | null = null;

const VERSIONED_MEDIA_PATTERN = /[_-][a-f0-9]{8,}(?:[-_]\d+w)?\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i;

function getGoogleStorage() {
  googleStorage ??= new Storage();
  return googleStorage;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 404
  );
}

function storageKeyCandidates(key: string): string[] {
  // Existing production assets were uploaded under assets/, while application
  // URLs retain their original /manus-storage/<filename> form. Prefer the
  // canonical root key for newly generated assets and fall back for legacy ones.
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
          console.error("[StorageProxy] GCS stream failed:", error);
          if (!res.headersSent) res.status(502).send("Storage proxy error");
          else res.destroy(error);
        })
        .pipe(res);
      return;
    } catch (error) {
      if (isNotFound(error)) continue;
      console.error("[StorageProxy] GCS read failed:", error);
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
      console.error(`[StorageProxy] legacy storage error: ${forgeResp.status} ${body}`);
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
    console.error("[StorageProxy] legacy storage failed:", error);
    res.status(502).send("Storage proxy error");
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (ENV.gcsBucket) {
      await serveGoogleCloudObject(key, res);
      return;
    }

    await redirectToLegacyObject(key, res);
  });
}
