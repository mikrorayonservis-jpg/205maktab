// Skriptlər üçün ortaq mühit yükləyicisi və Postgres (Supabase) bağlantısı. Heç bir default parol saxlanmır.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

export const ROOT = process.cwd();

export function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (fs.existsSync(file)) {
    for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 1) continue;
      const key = line.slice(0, i).trim();
      let val = line.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[xəta] ${name} mühit dəyişəni təyin edilməyib (.env faylını yoxlayın).`);
    process.exit(1);
  }
  return v;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Bağlantı parametrləri. Test bazası (DATABASE_URL_TEST) yalnız lokal ünvanda və ya adı "_test" ilə
 * bitən bazada ola bilər — testlər bazanı təmizlədiyi üçün real bazaya qoşulmanın qarşısı alınır.
 */
export function dbConfig({ test = false } = {}) {
  const url = new URL(test ? requireEnv("DATABASE_URL_TEST") : requireEnv("DATABASE_URL"));
  const database = decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres";
  const local = LOCAL_HOSTS.has(url.hostname);
  if (test && !local && !/_test$/.test(database)) {
    console.error("[xəta] Test bazası lokal olmalı və ya adı '_test' ilə bitməlidir (DATABASE_URL_TEST).");
    process.exit(1);
  }
  if (test && process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).toString() === url.toString()) {
    console.error("[xəta] DATABASE_URL_TEST əsas baza ilə eynidir.");
    process.exit(1);
  }
  url.searchParams.delete("sslmode");
  const mode = (process.env.DATABASE_SSL || "").toLowerCase();
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  const ssl = mode === "disable" || (local && mode !== "require") ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
  return { connectionString: url.toString(), ssl, database, host: url.hostname, url };
}

const normalize = (v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);

/** `?` → `$n` (src/lib/db.ts toPg() ilə eyni qaydalar; tests/unit/sql-params.test.mjs ikisini müqayisə edir). */
export function toPg(sql, params = []) {
  const values = [];
  const push = (v) => {
    values.push(normalize(v));
    return `$${values.length}`;
  };
  let out = "";
  let p = 0;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" || ch === '"') {
      const end = sql.indexOf(ch, i + 1);
      if (end === -1) throw new Error("SQL: bağlanmamış dırnaq");
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
        else if (Array.isArray(v[0])) out += v.map((row) => `(${row.map(push).join(", ")})`).join(", ");
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

// Tətbiqlə eyni nəticə formatı: DATE/TIMESTAMP mətn, TIMESTAMPTZ Bakı vaxtı ilə, bigint → number
const BAKU_OFFSET_MS = 4 * 3600 * 1000;
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (v) => v.slice(0, 19));
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (v) => {
  const ms = Date.parse(v.replace(" ", "T").replace(/([+-]\d{2})(?::?(\d{2}))?(?::\d{2})?$/, (_m, h, m) => `${h}:${m ?? "00"}`));
  return Number.isNaN(ms) ? v : new Date(ms + BAKU_OFFSET_MS).toISOString().slice(0, 19).replace("T", " ");
});

/**
 * Skriptlər üçün bağlantı. `query()` mysql2 ilə uyğun nəticə qaytarır:
 * SELECT → [rows], digər → [{ insertId, affectedRows, rows }] (INSERT-lərə avtomatik RETURNING * əlavə olunur).
 */
export async function connect(opts = {}) {
  const cfg = dbConfig(opts);
  const client = new pg.Client({ connectionString: cfg.connectionString, ssl: cfg.ssl });
  await client.connect();
  return {
    raw: client,
    async query(sql, params = []) {
      const stmt = /^\s*INSERT\b/i.test(sql) && !/\bRETURNING\b/i.test(sql) ? `${sql.trimEnd()} RETURNING *` : sql;
      const { text, values } = toPg(stmt, params);
      const res = await client.query(text, values);
      if (res.command === "SELECT") return [res.rows];
      const first = res.rows?.[0];
      return [{ insertId: first?.id != null ? Number(first.id) : 0, affectedRows: res.rowCount ?? 0, rows: res.rows ?? [] }];
    },
    /** Çoxlu ifadədən ibarət SQL faylı (parametrsiz, simple protocol). */
    exec: (sql) => client.query(sql),
    beginTransaction: () => client.query("BEGIN"),
    commit: () => client.query("COMMIT"),
    rollback: () => client.query("ROLLBACK"),
    end: () => client.end(),
  };
}

export const isTestFlag = () => process.argv.includes("--test");
