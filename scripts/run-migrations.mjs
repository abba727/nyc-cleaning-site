import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createPool } from "mysql2";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured`);
  return value;
}

function connectionOptions() {
  const socketPath = process.env.MYSQL_UNIX_SOCKET?.trim();
  return {
    host: socketPath ? undefined : (process.env.DB_HOST || "127.0.0.1"),
    port: socketPath ? undefined : Number.parseInt(process.env.DB_PORT || "3306", 10),
    socketPath: socketPath || undefined,
    user: required("DB_USER"),
    password: process.env.DB_PASS || "",
    database: required("DB_NAME"),
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  };
}

const pool = createPool(connectionOptions());
const db = drizzle(pool);

try {
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });
  console.log("[migrations] complete");
} finally {
  await pool.end();
}
