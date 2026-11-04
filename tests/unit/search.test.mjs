import { test } from "node:test";
import assert from "node:assert/strict";
import { foldSearchText, searchTerms, likePattern, sqlFold } from "../../src/lib/search.ts";

test("Azərbaycan hərfləri: böyük/kiçik hərf və I/ı/İ/i eyniləşir", () => {
  assert.equal(foldSearchText("ZƏFƏR GÜNÜ"), "zəfər günü");
  assert.equal(foldSearchText("İLK"), foldSearchText("ilk"));
  assert.equal(foldSearchText("ISTI"), foldSearchText("ıstı"));
  assert.equal(foldSearchText("Şagird Çıxışı Öyrənmə Ğ"), "şagird çixişi öyrənmə ğ");
});

test("sözlərə bölmə: boşluqlar normallaşır, təkrar və boş sorğu", () => {
  assert.deepEqual(searchTerms("  Zəfər   Günü  "), ["zəfər", "günü"]);
  assert.deepEqual(searchTerms("olimpiada OLİMPİADA"), ["olimpiada"]);
  assert.deepEqual(searchTerms(""), []);
  assert.deepEqual(searchTerms("   "), []);
  assert.deepEqual(searchTerms(undefined), []);
  assert.equal(searchTerms("a b c d e f g h").length, 6);
});

test("LIKE xüsusi simvolları qaçılır", () => {
  assert.equal(likePattern("50%_x\\"), "%50\%\_x\\%");
});

test("SQL qatlama ifadəsində yer tutucu yoxdur", () => {
  assert.ok(!sqlFold("n.title_az").includes("?"));
});
