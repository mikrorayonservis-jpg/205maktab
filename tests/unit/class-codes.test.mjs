import { test } from "node:test";
import assert from "node:assert/strict";
import { classSegment, codeHint, generateClassCode, gradeFromName, looksLikeClassCode, mapImportRows, normalizeClassCode, parseCsv } from "../../src/lib/class-codes.ts";

test("sinif adı kod hissəsinə çevrilir", () => {
  assert.equal(classSegment("10-B"), "10B");
  assert.equal(classSegment("9-A"), "09A");
  assert.equal(classSegment("5 a"), "05A");
  assert.equal(classSegment("11-Ə"), "11E");
  assert.equal(classSegment("8/Ç"), "08C");
  assert.equal(gradeFromName("10-B"), 10);
  assert.equal(gradeFromName("Hazırlıq"), null);
});

test("kod formatı: 205-10B-XXXXX, qarışdırıla bilən simvol yoxdur, təkrarlanmır", () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const c = generateClassCode("10-B");
    assert.match(c, /^205-10B-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
    seen.add(c);
  }
  assert.ok(seen.size > 1990, `təkrar çoxdur: ${2000 - seen.size}`);
});

test("normallaşdırma və tanıma", () => {
  assert.equal(normalizeClassCode(" 205-10b-k7m4p "), "20510BK7M4P");
  assert.ok(looksLikeClassCode("205-10B-K7M4P"));
  assert.ok(looksLikeClassCode("205-09a-r5t8n"));
  // fərdi dəvət kodu (0 və 1 yoxdur) sinif kodu kimi tanınmır
  assert.ok(!looksLikeClassCode("ABCD-EFGH-JKLM"));
  assert.ok(!looksLikeClassCode("205-10B"));
  assert.equal(codeHint("205-10B-K7M4P"), "7M4P");
});

test("CSV: vergül, nöqtəli vergül, dırnaq, BOM, CRLF", () => {
  assert.deepEqual(parseCsv("﻿a,b\r\n1,\"x, y\"\r\n\r\n2,\"say \"\"hi\"\"\"\n"), [["a", "b"], ["1", "x, y"], ["2", 'say "hi"']]);
  assert.deepEqual(parseCsv("student_id;first_name\n1001;Əli"), [["student_id", "first_name"], ["1001", "Əli"]]);
});

test("CSV başlıqları tanınır, səhv başlıq rədd edilir", () => {
  const ok = mapImportRows(parseCsv("student_id,first_name,last_name,class_code\n1001,Əli,Məmmədov,205-10B-K7M4P"));
  assert.equal(ok.error, undefined);
  assert.deepEqual(ok.rows[0], { line: 2, studentCode: "1001", firstName: "Əli", lastName: "Məmmədov", classCode: "205-10B-K7M4P", className: "" });
  assert.ok(mapImportRows(parseCsv("ad,soyad\nƏli,Məmmədov")).error);
  assert.ok(mapImportRows(parseCsv("class_code\n205-10B-K7M4P")).error);
  assert.equal(mapImportRows(parseCsv("Ad;Soyad;Sinif\nƏli;Məmmədov;10-B")).rows[0].className, "10-B");
});
