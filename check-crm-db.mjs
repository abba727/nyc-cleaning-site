import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is unavailable in this shell session.");
  process.exit(2);
}

const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, connectTimeout: 10000 });
try {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiryResponses'"
  );
  const [columns] = await connection.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiries' AND COLUMN_NAME = 'lastRespondedAt'"
  );
  console.log(JSON.stringify({ inquiryResponsesTable: tables.length === 1, lastRespondedAtColumn: columns.length === 1 }));
} finally {
  await connection.end();
}
