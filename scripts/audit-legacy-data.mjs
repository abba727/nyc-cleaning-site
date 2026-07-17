import mysql from "mysql2/promise";

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
    connectTimeout: 30_000,
  };
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replaceAll("`", "``")}\``;
}

const connection = await mysql.createConnection(connectionOptions());

try {
  const [databaseRows] = await connection.query("SELECT DATABASE() AS databaseName");
  const databaseName = databaseRows[0]?.databaseName;
  if (!databaseName) throw new Error("No database selected");

  const [tableRows] = await connection.query(
    `SELECT TABLE_NAME AS tableName, TABLE_TYPE AS tableType
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME`,
  );

  const tables = [];
  for (const table of tableRows) {
    const tableName = table.tableName;
    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS rowCount FROM ${quoteIdentifier(tableName)}`,
    );
    tables.push({
      tableName,
      tableType: table.tableType,
      rowCount: Number(countRows[0]?.rowCount ?? 0),
    });
  }

  const [columns] = await connection.query(
    `SELECT TABLE_NAME AS tableName,
            COLUMN_NAME AS columnName,
            ORDINAL_POSITION AS ordinalPosition,
            COLUMN_TYPE AS columnType,
            IS_NULLABLE AS isNullable,
            COLUMN_DEFAULT AS columnDefault,
            COLUMN_KEY AS columnKey,
            EXTRA AS extra
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
  );

  const [indexes] = await connection.query(
    `SELECT TABLE_NAME AS tableName,
            INDEX_NAME AS indexName,
            NON_UNIQUE AS nonUnique,
            SEQ_IN_INDEX AS sequenceInIndex,
            COLUMN_NAME AS columnName
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
  );

  const [foreignKeys] = await connection.query(
    `SELECT TABLE_NAME AS tableName,
            COLUMN_NAME AS columnName,
            CONSTRAINT_NAME AS constraintName,
            REFERENCED_TABLE_NAME AS referencedTableName,
            REFERENCED_COLUMN_NAME AS referencedColumnName
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
  );

  const report = {
    auditVersion: 1,
    mode: "read-only-schema-and-count-inventory",
    databaseName,
    generatedAt: new Date().toISOString(),
    tables,
    columns,
    indexes,
    foreignKeys,
  };

  console.log(JSON.stringify(report, null, 2));
} finally {
  await connection.end();
}
