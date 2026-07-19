import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIGRATIONS_TABLE = "__drizzle_migrations";
const RECONCILIATION_FLAG = "RECONCILE_MIGRATION_HISTORY";

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replaceAll("`", "``")}\``;
}

function sameStringArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function normalizeType(value) {
  const type = String(value || "").toLowerCase().replaceAll(" ", "");
  if (type === "boolean") return "tinyint(1)";
  return type.replace(/^(smallint|mediumint|int|bigint)\(\d+\)$/, "$1");
}

function normalizeDefault(value) {
  if (value === null || value === undefined) return null;

  let normalized = String(value).trim().toLowerCase();
  while (normalized.startsWith("(") && normalized.endsWith(")")) {
    normalized = normalized.slice(1, -1).trim();
  }
  if (normalized === "now()" || normalized === "current_timestamp()") {
    return "current_timestamp";
  }
  if (normalized === "true") return "1";
  if (normalized === "false") return "0";
  if (normalized.startsWith("'") && normalized.endsWith("'")) {
    return normalized.slice(1, -1);
  }
  return normalized;
}

function expectedIndexSignatures(table) {
  const signatures = [];
  for (const constraint of Object.values(table.compositePrimaryKeys || {})) {
    signatures.push(`PRIMARY:${constraint.columns.join(",")}`);
  }
  for (const constraint of Object.values(table.uniqueConstraints || {})) {
    signatures.push(`UNIQUE:${constraint.columns.join(",")}`);
  }
  for (const index of Object.values(table.indexes || {})) {
    const columns = (index.columns || []).map((column) =>
      typeof column === "string" ? column : column.expression,
    );
    signatures.push(`${index.unique ? "UNIQUE" : "INDEX"}:${columns.join(",")}`);
  }
  return signatures.sort();
}

function actualIndexSignatures(indexes) {
  const grouped = new Map();
  for (const index of indexes) {
    const key = index.indexName;
    const entry = grouped.get(key) || { indexName: key, nonUnique: Number(index.nonUnique), columns: [] };
    entry.columns.push({ position: Number(index.position), name: index.columnName });
    grouped.set(key, entry);
  }

  return [...grouped.values()]
    .map((index) => {
      const kind = index.indexName === "PRIMARY" ? "PRIMARY" : index.nonUnique === 0 ? "UNIQUE" : "INDEX";
      const columns = index.columns
        .sort((left, right) => left.position - right.position)
        .map((column) => column.name);
      return `${kind}:${columns.join(",")}`;
    })
    .sort();
}

export function compareSchemaToSnapshot(actual, snapshot) {
  const mismatches = [];
  const expectedTables = Object.keys(snapshot.tables).sort();
  const actualTables = [...actual.tables.keys()].sort();

  if (!sameStringArray(actualTables, expectedTables)) {
    mismatches.push(
      `table set differs (expected: ${expectedTables.join(", ") || "none"}; found: ${actualTables.join(", ") || "none"})`,
    );
    return mismatches;
  }

  for (const tableName of expectedTables) {
    const expectedTable = snapshot.tables[tableName];
    const actualTable = actual.tables.get(tableName);
    const expectedColumns = Object.values(expectedTable.columns || {});
    const actualColumns = actualTable.columns;

    if (actualColumns.length !== expectedColumns.length) {
      mismatches.push(
        `${tableName}: column count differs (expected ${expectedColumns.length}; found ${actualColumns.length})`,
      );
      continue;
    }

    for (const [index, expectedColumn] of expectedColumns.entries()) {
      const actualColumn = actualColumns[index];
      const expectedType = normalizeType(expectedColumn.type);
      const actualType = normalizeType(actualColumn.type);
      const expectedDefault = normalizeDefault(expectedColumn.default);
      const actualDefault = normalizeDefault(actualColumn.default);
      const expectedAutoIncrement = Boolean(expectedColumn.autoincrement);
      const actualAutoIncrement = /auto_increment/i.test(actualColumn.extra || "");
      const expectedOnUpdate = Boolean(expectedColumn.onUpdate);
      const actualOnUpdate = /on update current_timestamp/i.test(actualColumn.extra || "");

      if (actualColumn.name !== expectedColumn.name) {
        mismatches.push(`${tableName}: column ${index + 1} expected ${expectedColumn.name}; found ${actualColumn.name}`);
      }
      if (actualType !== expectedType) {
        mismatches.push(`${tableName}.${expectedColumn.name}: type expected ${expectedType}; found ${actualType}`);
      }
      if (Boolean(expectedColumn.notNull) !== Boolean(actualColumn.notNull)) {
        mismatches.push(
          `${tableName}.${expectedColumn.name}: nullability differs (expected ${expectedColumn.notNull ? "NOT NULL" : "NULL"})`,
        );
      }
      if (expectedDefault !== actualDefault) {
        mismatches.push(
          `${tableName}.${expectedColumn.name}: default expected ${expectedDefault ?? "NULL"}; found ${actualDefault ?? "NULL"}`,
        );
      }
      if (expectedAutoIncrement !== actualAutoIncrement) {
        mismatches.push(`${tableName}.${expectedColumn.name}: auto-increment setting differs`);
      }
      if (expectedOnUpdate !== actualOnUpdate) {
        mismatches.push(`${tableName}.${expectedColumn.name}: on-update setting differs`);
      }
    }

    const expectedIndexes = expectedIndexSignatures(expectedTable);
    const foundIndexes = actualIndexSignatures(actualTable.indexes);
    if (!sameStringArray(expectedIndexes, foundIndexes)) {
      mismatches.push(
        `${tableName}: key set differs (expected ${expectedIndexes.join(", ") || "none"}; found ${foundIndexes.join(", ") || "none"})`,
      );
    }

    if (actualTable.foreignKeys.length > 0 || Object.keys(expectedTable.foreignKeys || {}).length > 0) {
      mismatches.push(`${tableName}: foreign-key definitions require manual review`);
    }
  }

  return mismatches;
}

async function loadMigrationState(migrationsFolder) {
  const journal = JSON.parse(await readFile(path.join(migrationsFolder, "meta", "_journal.json"), "utf8"));
  const entries = [];

  for (const entry of journal.entries) {
    const sql = await readFile(path.join(migrationsFolder, `${entry.tag}.sql`), "utf8");
    const snapshotName = `${entry.tag.slice(0, 4)}_snapshot.json`;
    const snapshot = JSON.parse(await readFile(path.join(migrationsFolder, "meta", snapshotName), "utf8"));
    entries.push({
      tag: entry.tag,
      createdAt: Number(entry.when),
      hash: createHash("sha256").update(sql).digest("hex"),
      snapshot,
    });
  }

  return entries;
}

async function migrationTableExists(connection, database) {
  const [rows] = await connection.query(
    "SELECT 1 AS found FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1",
    [database, MIGRATIONS_TABLE],
  );
  return rows.length > 0;
}

async function readRecordedHistory(connection, database) {
  if (!(await migrationTableExists(connection, database))) return [];
  const [rows] = await connection.query(
    `SELECT hash, created_at AS createdAt FROM ${quoteIdentifier(MIGRATIONS_TABLE)} ORDER BY created_at ASC, id ASC`,
  );
  return rows.map((row) => ({ hash: row.hash, createdAt: Number(row.createdAt) }));
}

function historyIsVerifiedPrefix(recorded, expected) {
  return (
    recorded.length <= expected.length &&
    recorded.every(
      (migration, index) =>
        migration.hash === expected[index].hash && migration.createdAt === expected[index].createdAt,
    )
  );
}

async function inspectSchema(connection, database) {
  const [tableRows] = await connection.query(
    "SELECT TABLE_NAME AS tableName FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
    [database],
  );
  const tableNames = tableRows
    .map((row) => row.tableName)
    .filter((tableName) => tableName !== MIGRATIONS_TABLE);
  const tables = new Map(tableNames.map((tableName) => [tableName, { columns: [], indexes: [], foreignKeys: [] }]));

  if (tableNames.length === 0) return { tables };

  const placeholders = tableNames.map(() => "?").join(", ");
  const values = [database, ...tableNames];
  const [columnRows] = await connection.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, COLUMN_TYPE AS type, IS_NULLABLE AS isNullable, COLUMN_DEFAULT AS columnDefault, EXTRA AS extra, ORDINAL_POSITION AS ordinalPosition
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})
      ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    values,
  );
  for (const row of columnRows) {
    tables.get(row.tableName).columns.push({
      name: row.columnName,
      type: row.type,
      notNull: row.isNullable === "NO",
      default: row.columnDefault,
      extra: row.extra,
      position: Number(row.ordinalPosition),
    });
  }

  const [indexRows] = await connection.query(
    `SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique, SEQ_IN_INDEX AS position, COLUMN_NAME AS columnName
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    values,
  );
  for (const row of indexRows) {
    tables.get(row.tableName).indexes.push({
      indexName: row.indexName,
      nonUnique: Number(row.nonUnique),
      position: Number(row.position),
      columnName: row.columnName,
    });
  }

  const [foreignKeyRows] = await connection.query(
    `SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders}) AND REFERENCED_TABLE_NAME IS NOT NULL`,
    values,
  );
  for (const row of foreignKeyRows) {
    tables.get(row.tableName).foreignKeys.push({ name: row.constraintName });
  }

  return { tables };
}

async function writeMissingHistory(connection, recordedCount, matchingSnapshotIndex, migrations) {
  const missing = migrations.slice(recordedCount, matchingSnapshotIndex + 1);
  if (missing.length === 0) return;

  await connection.beginTransaction();
  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(MIGRATIONS_TABLE)} (
        id serial primary key,
        hash text not null,
        created_at bigint
      )`,
    );
    for (const migration of missing) {
      await connection.query(
        `INSERT INTO ${quoteIdentifier(MIGRATIONS_TABLE)} (hash, created_at) VALUES (?, ?)`,
        [migration.hash, migration.createdAt],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  console.log(
    `[migrations] verified schema matches ${migrations[matchingSnapshotIndex].tag}; recorded ${missing.length} missing migration history entr${missing.length === 1 ? "y" : "ies"}`,
  );
}

export async function reconcileVerifiedMigrationHistory(pool, migrationsFolder) {
  if (process.env[RECONCILIATION_FLAG] !== "true") return;

  const connection = await pool.promise().getConnection();
  try {
    const database = process.env.DB_NAME?.trim();
    if (!database) throw new Error("DB_NAME must be configured before migration reconciliation");

    const migrations = await loadMigrationState(migrationsFolder);
    const recorded = await readRecordedHistory(connection, database);
    if (!historyIsVerifiedPrefix(recorded, migrations)) {
      throw new Error("existing __drizzle_migrations history is not a verified prefix of the checked-in migration journal; refusing reconciliation");
    }

    const actual = await inspectSchema(connection, database);
    if (actual.tables.size === 0) {
      if (recorded.length > 0) {
        throw new Error("migration history exists but the application schema is empty; refusing reconciliation");
      }
      console.log("[migrations] schema is empty; no migration-history reconciliation required");
      return;
    }

    const matches = migrations
      .map((migration, index) => ({ index, migration, mismatches: compareSchemaToSnapshot(actual, migration.snapshot) }))
      .filter((candidate) => candidate.mismatches.length === 0);
    const match = matches.at(-1);

    if (!match) {
      const finalCheck = compareSchemaToSnapshot(actual, migrations.at(-1).snapshot);
      throw new Error(
        `existing schema does not exactly match a checked-in migration snapshot; refusing reconciliation. Sample differences: ${finalCheck.slice(0, 8).join("; ")}`,
      );
    }
    if (recorded.length > match.index + 1) {
      throw new Error(
        `migration history records ${recorded.length} migrations but the verified schema matches only ${match.migration.tag}; refusing reconciliation`,
      );
    }

    await writeMissingHistory(connection, recorded.length, match.index, migrations);
  } finally {
    connection.release();
  }
}

export const __testOnly = {
  actualIndexSignatures,
  expectedIndexSignatures,
  normalizeDefault,
  normalizeType,
};
