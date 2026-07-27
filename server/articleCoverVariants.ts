import sharp from "sharp";
import { storagePutAtKey } from "./storage";

const VARIANT_WIDTHS = [480, 800, 1200] as const;

type VariantFormat = "avif" | "webp";

function variantKey(sourceKey: string, width: number, format: VariantFormat) {
  const extensionIndex = sourceKey.lastIndexOf(".");
  if (extensionIndex <= 0) {
    throw new Error(`Article cover key has no usable extension: ${sourceKey}`);
  }
  return `${sourceKey.slice(0, extensionIndex)}-${width}w.${format}`;
}

async function buildVariant(source: Buffer, width: number, format: VariantFormat) {
  const pipeline = sharp(source, { failOn: "warning" })
    .rotate()
    .resize({ width, fit: "inside", withoutEnlargement: true });

  return format === "avif"
    ? pipeline.avif({ quality: 50, effort: 6, chromaSubsampling: "4:2:0" }).toBuffer()
    : pipeline.webp({ quality: 78, effort: 5, smartSubsample: true }).toBuffer();
}

/**
 * Create responsive derivatives next to a versioned CMS article-cover object.
 * A derivative failure does not discard the original upload; the browser can
 * always fall back to that original image.
 */
export async function createArticleCoverVariants(sourceKey: string, source: Buffer) {
  try {
    await Promise.all(
      VARIANT_WIDTHS.flatMap(width => (["avif", "webp"] as const).map(async format => {
        const data = await buildVariant(source, width, format);
        await storagePutAtKey(variantKey(sourceKey, width, format), data, `image/${format}`);
      })),
    );
  } catch (error) {
    console.error("[ArticleCoverVariants] Could not create responsive cover variants", {
      sourceKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
