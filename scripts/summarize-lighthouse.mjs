import fs from "node:fs";

const reportPath = process.argv[2];
if (!reportPath) {
  throw new Error("Usage: node scripts/summarize-lighthouse.mjs <report.json>");
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const audits = report.audits ?? {};
const ids = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "largest-contentful-paint-element",
  "lcp-lazy-loaded",
  "lcp-breakdown-insight",
  "render-blocking-insight",
  "unused-javascript",
  "third-party-summary",
  "long-tasks",
  "network-requests",
  "network-dependency-tree-insight",
  "uses-responsive-images",
  "uses-optimized-images",
  "uses-text-compression",
  "uses-long-cache-ttl",
];

for (const id of ids) {
  const audit = audits[id];
  if (!audit) continue;
  console.log(`\n## ${id}`);
  console.log(JSON.stringify({
    score: audit.score,
    scoreDisplayMode: audit.scoreDisplayMode,
    numericValue: audit.numericValue,
    displayValue: audit.displayValue,
    details: audit.details,
  }, null, 2));
}

console.log("\n## categories");
console.log(JSON.stringify(report.categories?.performance, null, 2));
