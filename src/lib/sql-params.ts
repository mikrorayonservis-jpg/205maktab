/**
 * SQL yer tutucularının çevrilməsi və vaxt formatı — saf funksiyalar (server-only deyil, unit testlər üçün).
 * Eyni qaydalar scripts/lib/env.mjs-də təkrarlanır; tests/unit/sql-params.test.mjs ikisini müqayisə edir.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = any[];

const BAKU_OFFSET_MS = 4 * 3600 * 1000;

/** Postgres timestamptz mətnini ("2026-11-03 06:00:00.123+00") Bakı yerli vaxtına çevirir. */
export function toBakuTimestamp(value: string): string {
  const iso = value.replace(" ", "T").replace(/([+-]\d{2})(?::?(\d{2}))?(?::\d{2})?$/, (_m, h: string, m?: string) => `${h}:${m ?? "00"}`);
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return value;
  return new Date(ms + BAKU_OFFSET_MS).toISOString().slice(0, 19).replace("T", " ");
}

function normalizeValue(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0; // bayraq sütunları SMALLINT 0/1-dir
  return v;
}

/** `?` yer tutucularını `$n`-ə çevirir; sətir literallarını, identifikatorları və şərhləri ötürür. */
export function toPg(sql: string, params: Params = []): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const push = (v: unknown) => {
    values.push(normalizeValue(v));
    return `$${values.length}`;
  };
  let out = "";
  let p = 0;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" || ch === '"') {
      const end = sql.indexOf(ch, i + 1);
      if (end === -1) throw new Error("SQL: bağlanmamış dırnaq");
      // '' və "" qaçış ardıcıllıqları: növbəti simvol da dırnaqdırsa davam et
      let j = end;
      while (sql[j + 1] === ch) {
        const next = sql.indexOf(ch, j + 2);
        if (next === -1) throw new Error("SQL: bağlanmamış dırnaq");
        j = next;
      }
      out += sql.slice(i, j + 1);
      i = j;
    } else if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      out += sql.slice(i, stop);
      i = stop - 1;
    } else if (ch === "?") {
      if (p >= params.length) throw new Error("SQL: parametr sayı yer tutucularından azdır");
      const v = params[p++];
      if (Array.isArray(v)) {
        if (!v.length) out += "NULL";
        else if (Array.isArray(v[0])) out += v.map((row: unknown[]) => `(${row.map(push).join(", ")})`).join(", ");
        else out += v.map(push).join(", ");
      } else {
        out += push(v);
      }
    } else {
      out += ch;
    }
  }
  if (p !== params.length) throw new Error("SQL: parametr sayı yer tutucularından çoxdur");
  return { text: out, values };
}
