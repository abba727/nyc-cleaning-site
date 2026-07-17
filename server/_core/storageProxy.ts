import { Storage } from "@google-cloud/storage";
import type { Express, Response } from "express";
import { ENV } from "./env";

let googleStorage: Storage | null = null;

function getGoogleStorage() {
  googleStorage ??= new Storage();
  return googleStorage;
}

async function serveGoogleCloudObject(key: string, res: Response) {
  const file = getGoogleStorage().bucket(ENV.gcsBucket).file(key);

  try {
    const [metadata] = await file.getMetadata();
    res.set({
      "Content-Type": metadata.contentType || "application/octet-stream",
      "Cache-Control": metadata.cacheControl || "public, max-age=3600",
    });
    if (metadata.etag) res.set("ETag", metadata.etag);
    file.createReadStream()
      .on("error", (error) => {
        console.error("[StorageProxy] GCS stream failed:", error);
        if (!res.headersSent) res.status(502).send("Storage proxy error");
        else res.destroy(error);
      })
      .pipe(res);
  } catch (error) {
    const status = (error as { code?: number }).code === 404 ? 404 : 502;
    console.error("[StorageProxy] GCS read failed:", error);
    res.status(status).send(status === 404 ? "Asset not found" : "Storage backend error");
  }
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
