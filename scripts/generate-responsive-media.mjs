import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceDirectory = path.join(projectRoot, "client", "public", "media-src");
const outputDirectory = path.join(projectRoot, "assets", "responsive-media");

const images = [
  { source: "nyc-cleaning-hero-v2_40f4e363.png", widths: [400, 800, 1200] },
  { source: "nyc-cleaning-editorial-corrected_d52b94b5.png", widths: [400, 800, 1200] },
  { source: "nyc-cleaning-who-we-are-team-20260716_3cda4186.webp", widths: [400, 800, 1200] },
  { source: "nyc-cleaning-office-cleaning-v2_9470169a.png", widths: [400, 800] },
  { source: "nyc-cleaning-apartment-cleaning-v2_6ad72f22.png", widths: [400, 800] },
  { source: "nyc-cleaning-deep-cleaning-v2_f503466f.png", widths: [400, 800] },
  { source: "nyc-cleaning-porter-v2_06cbeb37.png", widths: [400, 800] },
  { source: "nyc-cleaning-common-area-v2_94e14b83.png", widths: [400, 800] },
];

const sourceStem = (fileName) => fileName.replace(/\.[^.]+$/, "");

async function buildVariant(source, width, format) {
  const input = path.join(sourceDirectory, source);
  const output = path.join(outputDirectory, `${sourceStem(source)}-${width}w.${format}`);
  const pipeline = sharp(input, { failOn: "warning" })
    .rotate()
    .resize({ width, fit: "inside", withoutEnlargement: true });

  if (format === "avif") {
    await pipeline.avif({ quality: 50, effort: 6, chromaSubsampling: "4:2:0" }).toFile(output);
  } else {
    await pipeline.webp({ quality: 78, effort: 5, smartSubsample: true }).toFile(output);
  }

  const stats = await fs.stat(output);
  return { file: path.basename(output), bytes: stats.size };
}

async function main() {
  await fs.mkdir(outputDirectory, { recursive: true });
  const results = [];

  for (const image of images) {
    const input = path.join(sourceDirectory, image.source);
    await fs.access(input);

    for (const width of image.widths) {
      results.push(
        await buildVariant(image.source, width, "avif"),
        await buildVariant(image.source, width, "webp"),
      );
    }
  }

  results.sort((a, b) => a.file.localeCompare(b.file));
  await fs.writeFile(
    path.join(outputDirectory, "manifest.json"),
    `${JSON.stringify(results, null, 2)}\n`,
  );

  const totalBytes = results.reduce((sum, result) => sum + result.bytes, 0);
  console.log(`Generated ${results.length} responsive variants (${(totalBytes / 1024 / 1024).toFixed(2)} MiB).`);
}

main().catch((error) => {
  console.error("Unable to generate responsive media:", error);
  process.exitCode = 1;
});
