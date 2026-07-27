import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputDirectory = path.join(projectRoot, "assets", "responsive-media");
const sourceUrl = "https://www.nyccleaning.co/media/nyc-cleaning-logo_aabc7372.webp";
const stem = "nyc-cleaning-logo_aabc7372";
const widths = [240, 400];

async function buildVariant(source, width, format) {
  const output = path.join(outputDirectory, `${stem}-${width}w.${format}`);
  const pipeline = sharp(source, { failOn: "warning" })
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
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Unable to retrieve logo source (${response.status})`);
  const source = Buffer.from(await response.arrayBuffer());
  const results = [];

  for (const width of widths) {
    results.push(await buildVariant(source, width, "avif"));
    results.push(await buildVariant(source, width, "webp"));
  }

  console.log(`Generated ${results.length} responsive logo variants (${results.map(result => result.file).join(", ")}).`);
}

main().catch(error => {
  console.error("Unable to generate responsive logo variants:", error);
  process.exitCode = 1;
});
