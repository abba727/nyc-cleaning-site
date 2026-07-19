import sharp from "sharp";

const metadata = await sharp("client/public/media-src/nyc-cleaning-logo_aabc7372.webp").metadata();
console.log(JSON.stringify({ width: metadata.width, height: metadata.height, format: metadata.format }));
