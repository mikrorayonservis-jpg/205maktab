import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPassword, passwordSchemaFor } from "../../src/lib/password-policy.ts";

const digits8 = { mode: "digits", length: 8 };
const strong = { mode: "strong" };

test("digits rejimi: yalnız düz 8 rəqəm qəbul edilir", () => {
  assert.equal(checkPassword("12345678", digits8), null);
  for (const bad of ["1234567", "123456789", "1234567a", "abcdefgh", "1234 678", ""]) assert.ok(checkPassword(bad, digits8), bad);
});

test("strong rejimi: uzunluq, böyük/kiçik hərf və rəqəm tələb olunur", () => {
  assert.equal(checkPassword("Mekteb2026x", strong), null);
  assert.equal(checkPassword("Şagird2026ə", strong), null);
  for (const bad of ["12345678", "qısa1A", "hamisikicik2026", "HAMISIBOYUK2026", "HerfRəqəmsiz"]) assert.ok(checkPassword(bad, strong), bad);
});

test("server sxemi brauzer yoxlaması ilə eyni nəticə verir", () => {
  for (const [p, v] of [[digits8, "12345678"], [digits8, "1234"], [strong, "Mekteb2026x"], [strong, "zeif"]]) {
    assert.equal(passwordSchemaFor(p).safeParse(v).success, checkPassword(v, p) === null);
  }
});
