import assert from "node:assert/strict";
import { compareSchemaToSnapshot, __testOnly } from "./migration-reconciliation.mjs";

assert.equal(__testOnly.normalizeType("INT(11)"), "int");
assert.equal(__testOnly.normalizeType("boolean"), "tinyint(1)");
assert.equal(__testOnly.normalizeDefault("(CURRENT_TIMESTAMP)"), "current_timestamp");
assert.equal(__testOnly.normalizeDefault("'pending'"), "pending");
assert.equal(__testOnly.normalizeDefault(false), "0");

const snapshot = {
  tables: {
    example: {
      columns: {
        id: { name: "id", type: "int", notNull: true, autoincrement: true },
        active: { name: "active", type: "boolean", notNull: true, default: false },
        updatedAt: { name: "updatedAt", type: "timestamp", notNull: true, default: "(now())", onUpdate: true },
      },
      compositePrimaryKeys: { example_id: { columns: ["id"] } },
      uniqueConstraints: {},
      indexes: {},
      foreignKeys: {},
    },
  },
};

const matchingActual = {
  tables: new Map([
    [
      "example",
      {
        columns: [
          { name: "id", type: "int(11)", notNull: true, default: null, extra: "auto_increment" },
          { name: "active", type: "tinyint(1)", notNull: true, default: "0", extra: "" },
          { name: "updatedAt", type: "timestamp", notNull: true, default: "CURRENT_TIMESTAMP", extra: "on update CURRENT_TIMESTAMP" },
        ],
        indexes: [{ indexName: "PRIMARY", nonUnique: 0, position: 1, columnName: "id" }],
        foreignKeys: [],
      },
    ],
  ]),
};

assert.deepEqual(compareSchemaToSnapshot(matchingActual, snapshot), []);

const driftedActual = structuredClone(matchingActual);
driftedActual.tables.get("example").columns[1].default = "1";
assert.match(compareSchemaToSnapshot(driftedActual, snapshot).join("\n"), /default expected 0; found 1/);

console.log("migration reconciliation tests passed");
