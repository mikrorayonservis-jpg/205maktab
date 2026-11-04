// Sinif dəvət kodları və CSV oxuma üçün saf funksiyalar (server-only deyil; unit testlər üçün).
import crypto from "node:crypto";

/** Məktəbin nömrəsi koddakı ilk hissədir: 205-10B-K7M4P */
export const SCHOOL_CODE_PREFIX = "205";

// Qarışdırıla bilən simvollar yoxdur (0/O, 1/I/L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const RANDOM_LENGTH = 5;

const AZ_ASCII: Record<string, string> = { Ə: "E", Ç: "C", Ş: "S", Ğ: "G", Ö: "O", Ü: "U", İ: "I", I: "I" };

/** "10-B" → "10B", "9 a" → "09A", "11-Ə" → "11E"; qeyri-standart ad → ilk 6 hərf-rəqəm. */
export function classSegment(name: string): string {
  const up = name.toLocaleUpperCase("az").replace(/[ƏÇŞĞÖÜİ]/g, (c) => AZ_ASCII[c] ?? c);
  const m = up.match(/^\s*(\d{1,2})\s*[-\s/.]?\s*([A-Z]{1,2})\s*$/);
  if (m) return `${m[1].padStart(2, "0")}${m[2]}`;
  return up.replace(/[^A-Z0-9]/g, "").slice(0, 6) || "X";
}

/** Sinif adından səviyyə: "10-B" → 10. Tapılmasa null. */
export function gradeFromName(name: string): number | null {
  const m = name.trim().match(/^(\d{1,2})/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

/** Kriptoqrafik təsadüfi kod: 205-10B-K7M4P */
export function generateClassCode(className: string): string {
  // Rədd etmə üsulu ilə bərabər paylanma (modulo meyli yoxdur)
  const limit = 256 - (256 % ALPHABET.length);
  let s = "";
  while (s.length < RANDOM_LENGTH) {
    for (const b of crypto.randomBytes(RANDOM_LENGTH * 2)) {
      if (b < limit && s.length < RANDOM_LENGTH) s += ALPHABET[b % ALPHABET.length];
    }
  }
  return `${SCHOOL_CODE_PREFIX}-${classSegment(className)}-${s}`;
}

/** Axtarış forması: böyük hərf, yalnız A-Z0-9 ("205-10b-k7m4p " → "20510BK7M4P") */
export function normalizeClassCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Sinif kodu kimi görünürmü (məktəb prefiksi + sinif + 5 simvol). Yalnız ilkin süzgəcdir; həqiqi yoxlama DB-dədir. */
export function looksLikeClassCode(code: string): boolean {
  return new RegExp(`^${SCHOOL_CODE_PREFIX}[A-Z0-9]{2,6}[${ALPHABET}]{${RANDOM_LENGTH}}$`).test(normalizeClassCode(code));
}

/** Loglarda və auditdə yalnız son 4 simvol göstərilir */
export function codeHint(code: string): string {
  return normalizeClassCode(code).slice(-4);
}

// ---------------------------------------------------------------- CSV

/**
 * CSV mətnini sətirlərə ayırır. Ayırıcı başlıq sətrindən avtomatik seçilir (Excel-in Azərbaycan
 * lokalı ";" yazır), dırnaqlı sahələr, "" qaçışı, CRLF və UTF-8 BOM dəstəklənir. Boş sətirlər atılır.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const counts = { ";": 0, ",": 0, "\t": 0 } as Record<string, number>;
  let q = false;
  for (const ch of firstLine) {
    if (ch === '"') q = !q;
    else if (!q && ch in counts) counts[ch]++;
  }
  const [best, bestCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const sep = bestCount > 0 ? best : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

export interface ImportRow {
  line: number;
  studentCode: string;
  firstName: string;
  lastName: string;
  classCode: string;
  className: string;
}

const HEADER_ALIASES: Record<keyof Omit<ImportRow, "line">, string[]> = {
  studentCode: ["student_id", "student_code", "sagird_kodu", "şagird_kodu", "kod"],
  firstName: ["first_name", "ad"],
  lastName: ["last_name", "soyad"],
  classCode: ["class_code", "sinif_kodu"],
  className: ["class", "class_name", "sinif"],
};

/** Başlıq sətrini tanıyır və sətirləri obyektlərə çevirir. Tanınmayan başlıq → xəta. */
export function mapImportRows(table: string[][]): { rows: ImportRow[]; error?: string } {
  if (!table.length) return { rows: [], error: "Fayl boşdur." };
  const header = table[0].map((h) => h.toLocaleLowerCase("az").replace(/\s+/g, "_"));
  const idx = {} as Record<keyof Omit<ImportRow, "line">, number>;
  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [keyof Omit<ImportRow, "line">, string[]][]) {
    idx[key] = header.findIndex((h) => aliases.includes(h));
  }
  if (idx.classCode < 0 && idx.className < 0) return { rows: [], error: "Başlıqda class_code (və ya class_name) sütunu tapılmadı." };
  if (idx.studentCode < 0 && (idx.firstName < 0 || idx.lastName < 0)) {
    return { rows: [], error: "Başlıqda student_id və ya first_name + last_name sütunları olmalıdır." };
  }
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const rows = table.slice(1).map((r, i) => ({
    line: i + 2,
    studentCode: get(r, idx.studentCode),
    firstName: get(r, idx.firstName),
    lastName: get(r, idx.lastName),
    classCode: get(r, idx.classCode),
    className: get(r, idx.className),
  }));
  return { rows };
}
