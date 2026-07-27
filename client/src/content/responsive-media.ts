import { brandAssets } from "./assets";

type ResponsiveMedia = {
  avifSrcSet: string;
  fallbackSrcSet: string;
  sizes: string;
};

const storageVariant = (stem: string, width: number, format: "avif" | "webp") =>
  `/media/responsive-media/${stem}-${width}w.${format}`;

const createResponsiveMedia = (
  stem: string,
  widths: number[],
  sizes: string,
): ResponsiveMedia => ({
  avifSrcSet: widths.map(width => `${storageVariant(stem, width, "avif")} ${width}w`).join(", "),
  fallbackSrcSet: widths.map(width => `${storageVariant(stem, width, "webp")} ${width}w`).join(", "),
  sizes,
});

export const responsiveMedia = {
  logo: createResponsiveMedia(
    "nyc-cleaning-logo_aabc7372",
    [240, 400],
    "214px",
  ),
  hero: createResponsiveMedia(
    "nyc-cleaning-hero-v2_40f4e363",
    [400, 800, 1200],
    "100vw",
  ),
  commercialCleaning: createResponsiveMedia(
    "nyc-cleaning-editorial-corrected_d52b94b5",
    [400, 800, 1200],
    "(max-width: 700px) calc(100vw - 40px), 400px",
  ),
  aboutTeam: createResponsiveMedia(
    "nyc-cleaning-who-we-are-team-20260716_3cda4186",
    [400, 800, 1200],
    "(max-width: 700px) calc(100vw - 40px), 560px",
  ),
  officeCleaning: createResponsiveMedia(
    "nyc-cleaning-office-cleaning-v2_9470169a",
    [400, 800],
    "(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) calc(50vw - 30px), 380px",
  ),
  apartmentCleaning: createResponsiveMedia(
    "nyc-cleaning-apartment-cleaning-v2_6ad72f22",
    [400, 800],
    "(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) calc(50vw - 30px), 380px",
  ),
  deepCleaning: createResponsiveMedia(
    "nyc-cleaning-deep-cleaning-v2_f503466f",
    [400, 800],
    "(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) calc(50vw - 30px), 380px",
  ),
  porter: createResponsiveMedia(
    "nyc-cleaning-porter-v2_06cbeb37",
    [400, 800],
    "(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) calc(50vw - 30px), 380px",
  ),
  commonArea: createResponsiveMedia(
    "nyc-cleaning-common-area-v2_94e14b83",
    [400, 800],
    "(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) calc(50vw - 30px), 380px",
  ),
} as const;

const responsiveMediaByAsset: Record<string, ResponsiveMedia> = {
  [brandAssets.logo]: responsiveMedia.logo,
  [brandAssets.hero]: responsiveMedia.hero,
  [brandAssets.commercialCleaning]: responsiveMedia.commercialCleaning,
  [brandAssets.aboutTeam]: responsiveMedia.aboutTeam,
  [brandAssets.officeCleaning]: responsiveMedia.officeCleaning,
  [brandAssets.apartmentCleaning]: responsiveMedia.apartmentCleaning,
  [brandAssets.deepCleaning]: responsiveMedia.deepCleaning,
  [brandAssets.porter]: responsiveMedia.porter,
  [brandAssets.commonArea]: responsiveMedia.commonArea,
};

export const getResponsiveMedia = (src: string) => responsiveMediaByAsset[src];

const CMS_ARTICLE_COVER_PATTERN = /^\/media\/(?:generated|article-covers)\/.+\.(?:avif|jpe?g|png|webp)$/i;

function articleCoverVariant(src: string, width: number, format: "avif" | "webp") {
  const sourcePath = src.split("?")[0];
  const extensionIndex = sourcePath.lastIndexOf(".");
  return `${sourcePath.slice(0, extensionIndex)}-${width}w.${format}`;
}

/**
 * CMS cover variants are generated alongside their original object and retain
 * the same immutable key. Unlike the fixed brand-media manifest, their URL can
 * therefore be derived safely from the public source path.
 */
export function getArticleCoverResponsiveMedia(src: string): ResponsiveMedia | undefined {
  const canonicalSource = src.replace(/^\/manus-storage\//, "/media/");
  if (!CMS_ARTICLE_COVER_PATTERN.test(canonicalSource)) return undefined;

  const widths = [480, 800, 1200];
  const sizes = "(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) calc(50vw - 30px), 400px";
  return {
    avifSrcSet: widths.map(width => `${articleCoverVariant(canonicalSource, width, "avif")} ${width}w`).join(", "),
    fallbackSrcSet: widths.map(width => `${articleCoverVariant(canonicalSource, width, "webp")} ${width}w`).join(", "),
    sizes,
  };
}
