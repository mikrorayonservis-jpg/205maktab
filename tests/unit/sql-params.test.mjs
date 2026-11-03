import { test } from "node:test";
import assert from "node:assert/strict";
import { toPg, toBakuTimestamp } from "../../src/lib/sql-params.ts";
import { toPg as scriptToPg } from "../../scripts/lib/env.mjs";

test("? yer tutucuları $n-ə çevrilir", () => {
  const r = toPg("SELECT * FROM users WHERE id = ? AND email = ?", [5, "a@b.az"]);
  assert.equal(r.text, "SELECT * FROM users WHERE id = $1 AND email = $2");
  assert.deepEqual(r.values, [5, "a@b.az"]);
});

test("massiv IN (?) siyahıya, massivlər massivi VALUES ? sətirlərə açılır", () => {
  assert.equal(toPg("x IN (?)", [[1, 2, 3]]).text, "x IN ($1, $2, $3)");
  assert.equal(toPg("x IN (?)", [[]]).text, "x IN (NULL)");
  const v = toPg("INSERT INTO t (a, b) VALUES ?", [[[1, "x"], [2, "y"]]]);
  assert.equal(v.text, "INSERT INTO t (a, b) VALUES ($1, $2), ($3, $4)");
  assert.deepEqual(v.values, [1, "x", 2, "y"]);
});

test("dırnaq içindəki və şərhdəki ? toxunulmur; boolean → 0/1, undefined → null", () => {
  const r = toPg("SELECT '?', \"a?b\", 'it''s ?' -- ?\n, ? , ?", [true, undefined]);
  assert.equal(r.text, "SELECT '?', \"a?b\", 'it''s ?' -- ?\n, $1 , $2");
  assert.deepEqual(r.values, [1, null]);
});

test("parametr sayı uyğun gəlmirsə xəta", () => {
  assert.throws(() => toPg("a = ? AND b = ?", [1]));
  assert.throws(() => toPg("a = ?", [1, 2]));
});

test("tətbiq və skript çeviriciləri eyni nəticə verir", () => {
  const cases = [
    ["SELECT 1"],
    ["a = ? AND b IN (?) AND c = '?'", [1, [2, 3]]],
    ["INSERT INTO n (u, t) VALUES ?", [[[1, "a"], [2, null]]]],
    ['UPDATE "x" SET y = ? -- ?\nWHERE z = ?', [false, 9]],
  ];
  for (const [sql, params] of cases) assert.deepEqual(toPg(sql, params), scriptToPg(sql, params));
});

test("timestamptz Bakı vaxtına (UTC+4) çevrilir", () => {
  assert.equal(toBakuTimestamp("2026-11-03 06:00:00+00"), "2026-11-03 10:00:00");
  assert.equal(toBakuTimestamp("2026-11-03 10:00:00.123456+04"), "2026-11-03 10:00:00");
  assert.equal(toBakuTimestamp("2026-11-03 21:30:00-02:30"), "2026-11-04 04:00:00");
  assert.equal(toBakuTimestamp("2026-12-31 22:00:00+00"), "2027-01-01 02:00:00");
});
