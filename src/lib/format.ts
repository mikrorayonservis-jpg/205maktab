/**
 * Azərbaycan formatları: DD.MM.YYYY, 24 saat, Asia/Baku.
 * DB-dən gələn tarixlər artıq Bakı vaxtında "YYYY-MM-DD HH:MM:SS" sətirləridir.
 */
export const MONTHS_AZ = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
export const WEEKDAYS_AZ = ["Bazar ertəsi", "Çərşənbə axşamı", "Çərşənbə", "Cümə axşamı", "Cümə", "Şənbə", "Bazar"];
export const WEEKDAYS_SHORT_AZ = ["B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş.", "B."];

function parts(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) {
    const f = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(value);
    const get = (t: string) => f.find((p) => p.type === t)?.value || "00";
    return { y: get("year"), m: get("month"), d: get("day"), hh: get("hour") === "24" ? "00" : get("hour"), mm: get("minute") };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(value));
  if (!m) return null;
  return { y: m[1], m: m[2], d: m[3], hh: m[4] || "00", mm: m[5] || "00" };
}

export function formatDate(value: string | Date | null | undefined): string {
  const p = parts(value);
  return p ? `${p.d}.${p.m}.${p.y}` : "";
}

export function formatTime(value: string | Date | null | undefined): string {
  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const p = parts(value);
  return p ? `${p.hh}:${p.mm}` : "";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const p = parts(value);
  return p ? `${p.d}.${p.m}.${p.y} ${p.hh}:${p.mm}` : "";
}

export function formatDateLong(value: string | Date | null | undefined): string {
  const p = parts(value);
  return p ? `${Number(p.d)} ${MONTHS_AZ[Number(p.m) - 1]} ${p.y}` : "";
}

/** Bugünkü tarix Bakı vaxtı ilə: YYYY-MM-DD */
export function todayBaku(): string {
  const p = parts(new Date())!;
  return `${p.y}-${p.m}-${p.d}`;
}

/** ISO tarixdən həftənin günü (1 = Bazar ertəsi ... 7 = Bazar) */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function startOfWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

export function formatNumber(n: number, digits = 0): string {
  return n.toFixed(digits).replace(".", ",");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, 0)} KB`;
  return `${formatNumber(bytes / 1024 / 1024, 1)} MB`;
}
