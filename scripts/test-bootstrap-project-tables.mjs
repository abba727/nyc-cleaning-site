import assert from "node:assert/strict";
import { __testOnly } from "./bootstrap-project-tables.mjs";

const { sameArray, TABLE_DEFINITIONS } = __testOnly;

assert.equal(sameArray(["id", "address"], ["id", "address"]), true);
assert.equal(sameArray(["id", "address"], ["address", "id"]), false);
assert.equal(sameArray(["id"], ["id", "address"]), false);

assert.deepEqual(
  TABLE_DEFINITIONS.map((table) => table.name),
  ["projectImports", "projectLocations", "siteSettings"],
);

for (const table of TABLE_DEFINITIONS) {
  assert.match(table.createSql, new RegExp("CREATE TABLE IF NOT EXISTS `" + table.name + "`"));
  assert.match(table.createSql, /PRIMARY KEY\(`id`\)/);
  assert.equal(table.columns[0], "id");
}

console.log("project and site-settings bootstrap tests passed");
