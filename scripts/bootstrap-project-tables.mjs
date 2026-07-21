import { createPool } from "mysql2/promise";

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

const CENSUS_BATCH_GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch?benchmark=Public_AR_Current";

function csvCell(value) {
  const text = String(value);
  return /[\",\n\r]/.test(text) ? `\"${text.replace(/\"/g, '\"\"')}\"` : text;
}

function parseCsvRecord(line) {
  const values = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function parseBatchResponse(responseText) {
  const coordinates = [];
  for (const line of responseText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [idText, , matchType, , , coordinateText] = parseCsvRecord(line);
    const id = Number.parseInt(idText, 10);
    const [longitudeText, latitudeText] = (coordinateText || "").split(",");
    const longitude = Number.parseFloat(longitudeText);
    const latitude = Number.parseFloat(latitudeText);
    if (matchType === "Match" && Number.isInteger(id) && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      coordinates.push({ id, latitude, longitude });
    }
  }
  return coordinates;
}

export async function backfillProjectCoordinates(pool) {
  if (process.env.GEOCODE_PENDING_PROJECT_LOCATIONS !== "true") {
    return { requestedCount: 0, geocodedCount: 0 };
  }

  const [rows] = await pool.query(
    `SELECT id, address, city, state, zip
     FROM projectLocations
     WHERE isActive = true AND (latitude IS NULL OR longitude IS NULL)
     ORDER BY id`,
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("[project-geocode] no active service locations require coordinates");
    return { requestedCount: 0, geocodedCount: 0 };
  }

  const csv = `${rows
    .map(row => [row.id, row.address, row.city, row.state, row.zip].map(csvCell).join(","))
    .join("\n")}\n`;
  const form = new FormData();
  form.append("addressFile", new Blob([csv], { type: "text/csv" }), "project-locations.csv");

  try {
    const response = await fetch(CENSUS_BATCH_GEOCODER_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Census geocoder returned HTTP ${response.status}`);

    const coordinates = parseBatchResponse(await response.text());
    for (const coordinate of coordinates) {
      await pool.query(
        `UPDATE projectLocations
         SET latitude = ?, longitude = ?
         WHERE id = ? AND (latitude IS NULL OR longitude IS NULL)`,
        [coordinate.latitude, coordinate.longitude, coordinate.id],
      );
    }
    console.log(`[project-geocode] stored coordinates for ${coordinates.length} of ${rows.length} active service locations`);
    return { requestedCount: rows.length, geocodedCount: coordinates.length };
  } catch (error) {
    console.warn("[project-geocode] could not backfill service-location coordinates; deployment will continue.", error);
    return { requestedCount: rows.length, geocodedCount: 0 };
  }
}

const TABLE_DEFINITIONS = [
  {
    name: "projectImports",
    columns: [
      "id",
      "filename",
      "sourceType",
      "rowCount",
      "importedCount",
      "skippedCount",
      "status",
      "errorSummary",
      "uploadedByUserId",
      "createdAt",
      "updatedAt",
    ],
    createSql: `CREATE TABLE IF NOT EXISTS \`projectImports\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`filename\` varchar(255) NOT NULL,
      \`sourceType\` enum('csv','xlsx','xls') NOT NULL,
      \`rowCount\` int NOT NULL DEFAULT 0,
      \`importedCount\` int NOT NULL DEFAULT 0,
      \`skippedCount\` int NOT NULL DEFAULT 0,
      \`status\` enum('completed','partial','failed') NOT NULL DEFAULT 'completed',
      \`errorSummary\` text,
      \`uploadedByUserId\` int NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`projectImports_id\` PRIMARY KEY(\`id\`)
    );`,
  },
  {
    name: "projectLocations",
    columns: [
      "id",
      "address",
      "city",
      "state",
      "zip",
      "label",
      "latitude",
      "longitude",
      "isActive",
      "importBatchId",
      "createdAt",
      "updatedAt",
    ],
    createSql: `CREATE TABLE IF NOT EXISTS \`projectLocations\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`address\` varchar(512) NOT NULL,
      \`city\` varchar(160) NOT NULL,
      \`state\` varchar(64) NOT NULL,
      \`zip\` varchar(24) NOT NULL,
      \`label\` varchar(255),
      \`latitude\` double,
      \`longitude\` double,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`importBatchId\` int,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`projectLocations_id\` PRIMARY KEY(\`id\`)
    );`,
  },
];

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export async function bootstrapProjectTables(pool, databaseName) {
  for (const table of TABLE_DEFINITIONS) {
    await pool.query(table.createSql);
  }

  const tableNames = TABLE_DEFINITIONS.map((table) => table.name);
  const placeholders = tableNames.map(() => "?").join(", ");
  const [columnRows] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [databaseName, ...tableNames],
  );
  const [primaryKeyRows] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders}) AND CONSTRAINT_NAME = 'PRIMARY'
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [databaseName, ...tableNames],
  );

  for (const table of TABLE_DEFINITIONS) {
    const columns = columnRows
      .filter((row) => row.TABLE_NAME === table.name)
      .map((row) => row.COLUMN_NAME);
    const primaryKey = primaryKeyRows
      .filter((row) => row.TABLE_NAME === table.name)
      .map((row) => row.COLUMN_NAME);

    if (!sameArray(columns, table.columns)) {
      throw new Error(
        `[project-bootstrap] ${table.name} exists but does not match the approved table shape; expected columns ${table.columns.join(", ")}, found ${columns.join(", ")}`,
      );
    }
    if (!sameArray(primaryKey, ["id"])) {
      throw new Error(
        `[project-bootstrap] ${table.name} exists but does not have the expected id primary key`,
      );
    }
  }

  console.log("[project-bootstrap] verified projectImports and projectLocations without modifying legacy tables");
}

async function main() {
  const options = connectionOptions();
  const pool = createPool(options);

  try {
    await bootstrapProjectTables(pool, options.database);
    await backfillProjectCoordinates(pool);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}

export const __testOnly = {
  csvCell,
  parseCsvRecord,
  parseBatchResponse,
  sameArray,
  TABLE_DEFINITIONS,
};
