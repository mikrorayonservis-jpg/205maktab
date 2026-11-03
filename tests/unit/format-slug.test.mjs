import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatDateTime, formatTime, isoWeekday, addDays, startOfWeek, formatDateLong, formatFileSize } from "../../src/lib/format.ts";
import { slugify } from "../../src/lib/slug.ts";

test("tarix formatı DD.MM.YYYY", () => {
  assert.equal(formatDate("2026-11-02"), "02.11.2026");
  assert.equal(formatDate("2026-11-02 14:05:00"), "02.11.2026");
  assert.equal(formatDate(null), "");
  assert.equal(formatDate("yanlış"), "");
});

test("saat 24 saat formatında", () => {
  assert.equal(formatTime("2026-11-02 21:07:00"), "21:07");
  assert.equal(formatTime("08:45:00"), "08:45");
  assert.equal(formatDateTime("2026-01-05 00:30:00"), "05.01.2026 00:30");
});

test("Date obyekti Asia/Baku saat qurşağına çevrilir", () => {
  assert.equal(formatDateTime(new Date("2026-03-10T20:30:00Z")), "11.03.2026 00:30");
});

test("həftə günü və tarix hesablamaları", () => {
  assert.equal(isoWeekday("2026-11-02"), 1); // Bazar ertəsi
  assert.equal(isoWeekday("2026-11-08"), 7);
  assert.equal(addDays("2026-02-27", 2), "2026-03-01");
  assert.equal(startOfWeek("2026-11-05"), "2026-11-02");
  assert.equal(formatDateLong("2026-06-01"), "1 iyun 2026");
  assert.equal(formatFileSize(1536), "2 KB");
});

test("Azərbaycan hərfləri ilə slug", () => {
  assert.equal(slugify("Şagird nailiyyətləri: Ölkə olimpiadası!"), "sagird-nailiyyetleri-olke-olimpiadasi");
  assert.equal(slugify("ÇĞIİÖŞÜ əəə"), "cgiiosu-eee");
  assert.equal(slugify("   "), "qeyd");
  assert.ok(slugify("a".repeat(300)).length <= 120);
});
