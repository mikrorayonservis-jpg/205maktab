import { test } from "node:test";
import assert from "node:assert/strict";
import { isOfficialUrl } from "../../src/lib/official-url.ts";

test("rəsmi ünvanlar qəbul edilir", () => {
  for (const u of ["https://jurnal.edu.az/login", "https://digital.edu.az/auth/digital/login/teacher", "https://mygovid.gov.az/auth", "https://portal.edu.az"]) {
    assert.equal(isOfficialUrl(u), true, u);
  }
});

test("saxta və ya təhlükəli ünvanlar rədd edilir", () => {
  for (const u of [
    "http://jurnal.edu.az/login",
    "https://jurnal-edu.az.evil.com/",
    "https://evil.com/?x=.edu.az",
    "https://edu.az.evil.com",
    "https://user:pw@jurnal.edu.az/",
    "https://jurnal.edu.az:8443/",
    "javascript:alert(1)//.edu.az",
    "https://xedu.az/",
    "",
    "jurnal.edu.az",
  ]) {
    assert.equal(isOfficialUrl(u), false, u);
  }
});
