import { brandAssets } from "./assets";

type ResponsiveMedia = {
  avifSrcSet: string;
  fallbackSrcSet: string;
  sizes: string;
};

const storageVariant = (stem: string, width: number, format: "avif" | "webp") =>
  `/manus-storage/responsive-media/${stem}-${width}w.${format}`;

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
