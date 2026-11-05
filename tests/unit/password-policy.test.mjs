import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPassword, passwordInputProps, passwordSchemaFor } from "../../src/lib/password-policy.ts";

const standard = { mode: "standard" };
const strong = { mode: "strong" };

test("standard rejimi: hərf, rəqəm və işarə qəbul edilir (yalnız rəqəm məhdudiyyəti yoxdur)", () => {
  for (const ok of ["qwertasd", "mekteb-ve-ev", "Şagird2026", "kitab123", "20261105", "p@rol uzun ifadə"]) assert.equal(checkPassword(ok, standard), null, ok);
  for (const bad of ["", "qısa1", "1234567", "        ", "aaaaaaaa", "12345678", "Password", "QWERTYUI", "x".repeat(129)]) assert.ok(checkPassword(bad, standard), bad);
});

test("strong rejimi: uzunluq, böyük/kiçik hərf və rəqəm tələb olunur", () => {
  assert.equal(checkPassword("Mekteb2026x", strong), null);
  assert.equal(checkPassword("Şagird2026ə", strong), null);
  for (const bad of ["12345678", "qısa1A", "hamisikicik2026", "HAMISIBOYUK2026", "HerfRəqəmsiz"]) assert.ok(checkPassword(bad, strong), bad);
});

test("parol sahəsi rəqəmli klaviaturaya və ya rəqəm şablonuna məhdudlaşdırılmır", () => {
  const props = passwordInputProps();
  assert.equal(props.inputMode, undefined);
  assert.equal(props.pattern, undefined);
  assert.equal(props.maxLength, 128);
});

test("server sxemi brauzer yoxlaması ilə eyni nəticə verir", () => {
  for (const [p, v] of [[standard, "qwertasd"], [standard, "1234"], [standard, "12345678"], [strong, "Mekteb2026x"], [strong, "zeif"]]) {
    assert.equal(passwordSchemaFor(p).safeParse(v).success, checkPassword(v, p) === null);
  }
});
