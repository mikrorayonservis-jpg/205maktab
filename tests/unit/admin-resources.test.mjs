import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { RESOURCES } from "../../src/config/admin-resources.ts";

const IDENT = /^[a-z_][a-z0-9_]*$/;
const rbac = JSON.parse(fs.readFileSync(new URL("../../src/config/rbac.json", import.meta.url), "utf8"));
const permissions = new Set(rbac.permissions.map((p) => p.code));

test("resurs açarları unikaldır", () => {
  const keys = RESOURCES.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("bütün SQL identifikatorları təhlükəsizdir", () => {
  for (const r of RESOURCES) {
    assert.match(r.table, IDENT, r.key);
    for (const f of r.fields) assert.match(f.name, IDENT, `${r.key}.${f.name}`);
    for (const s of r.search) assert.match(s, IDENT);
    for (const f of r.filters || []) assert.ok(r.fields.some((x) => x.name === f), `${r.key} filtr ${f}`);
  }
});

test("resurs icazələri RBAC-da mövcuddur", () => {
  for (const r of RESOURCES) {
    assert.ok(permissions.has(r.permission), `${r.key}: ${r.permission}`);
    for (const p of r.viewPermissions || []) assert.ok(permissions.has(p), p);
  }
});

test("məxfi müəllim sahələri işarələnib", () => {
  const t = RESOURCES.find((r) => r.key === "teachers");
  for (const name of ["phone_private", "address_private"]) assert.equal(t.fields.find((f) => f.name === name).private, true);
});

test("RBAC: şagird və valideyn rollarının idarəetmə icazəsi yoxdur", () => {
  const forbidden = ["admin.access", "users.manage", "grades.manage_own", "grades.manage_all", "grades.view_all", "roles.manage"];
  for (const role of ["student", "parent", "author"]) {
    for (const p of forbidden) assert.ok(!rbac.rolePermissions[role].includes(p), `${role} → ${p}`);
  }
  for (const [role, perms] of Object.entries(rbac.rolePermissions)) {
    for (const p of perms) assert.ok(p === "*" || permissions.has(p), `${role}: ${p}`);
  }
  assert.ok(!rbac.rolePermissions.editor.includes("roles.manage"));
  assert.ok(!rbac.rolePermissions.editor.includes("users.manage"));
});
