import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const root = process.cwd();
const content = JSON.parse(await fs.readFile(path.join(root, "client/src/content/legacy-articles.json"), "utf8"));
const images = JSON.parse(await fs.readFile(path.join(root, "client/src/content/article-images.json"), "utf8"));
const articles = content.filter(item => item.kind === "article");

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!process.env.OWNER_OPEN_ID) throw new Error("OWNER_OPEN_ID is required");
if (articles.length !== 95) throw new Error(`Expected 95 preserved articles, found ${articles.length}`);

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.beginTransaction();
  for (const article of articles) {
    const image = images[article.path];
    if (!image?.src || !image?.alt) throw new Error(`Missing verified cover asset for ${article.path}`);
    await connection.execute(
      `INSERT INTO articles
        (path, title, description, blocks, coverImageUrl, coverImageAlt, sourceUrl, status, publishedAt, createdByOpenId)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
       ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        blocks = VALUES(blocks),
        coverImageUrl = VALUES(coverImageUrl),
        coverImageAlt = VALUES(coverImageAlt),
        sourceUrl = VALUES(sourceUrl),
        status = 'published',
        publishedAt = VALUES(publishedAt)`,
      [
        article.path,
        article.title,
        article.description,
        JSON.stringify(article.blocks),
        image.src,
        image.alt,
        article.sourceUrl || null,
        new Date(article.publishedAt),
        process.env.OWNER_OPEN_ID,
      ],
    );
  }
  await connection.commit();
  console.log(`Migrated ${articles.length} preserved articles into the CMS.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
