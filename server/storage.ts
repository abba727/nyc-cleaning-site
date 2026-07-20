import { Storage } from "@google-cloud/storage";
import { ENV } from "./_core/env";

export const LEGACY_MEDIA_PATH_PREFIX = "/manus-storage/";
export const PUBLIC_MEDIA_PATH_PREFIX = "/media/";

let googleStorage: Storage | null = null;

function getGoogleStorage() {
  googleStorage ??= new Storage();
  return googleStorage;
}

function getLegacyForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set GCS_BUCKET or the legacy BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Converts a stored legacy media URL to the neutral public route. Existing
 * database values can remain readable while all newly emitted URLs are clean.
 */
export function toPublicMediaUrl(url: string): string {
  if (url.startsWith(LEGACY_MEDIA_PATH_PREFIX)) {
    return `${PUBLIC_MEDIA_PATH_PREFIX}${url.slice(LEGACY_MEDIA_PATH_PREFIX.length)}`;
  }
  return url;
}

export function publicMediaUrlForKey(relKey: string): string {
  return `${PUBLIC_MEDIA_PATH_PREFIX}${normalizeKey(relKey)}`;
}

async function putToGoogleCloudStorage(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
) {
  const bucket = getGoogleStorage().bucket(ENV.gcsBucket);
  const file = bucket.file(key);
  await file.save(data, {
    resumable: false,
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
}

async function putToLegacyStorage(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
) {
  const { forgeUrl, forgeKey } = getLegacyForgeConfig();
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: uploadUrl } = (await presignResp.json()) as { url: string };
  if (!uploadUrl) throw new Error("Legacy storage returned an empty upload URL");

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as BlobPart], { type: contentType });
  const uploadResp = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Legacy storage upload failed (${uploadResp.status})`);
  }
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  if (ENV.gcsBucket) {
    await putToGoogleCloudStorage(key, data, contentType);
  } else {
    await putToLegacyStorage(key, data, contentType);
  }

  return { key, url: publicMediaUrlForKey(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: publicMediaUrlForKey(key) };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  if (ENV.gcsBucket) {
    return publicMediaUrlForKey(key);
  }

  const { forgeUrl, forgeKey } = getLegacyForgeConfig();
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
