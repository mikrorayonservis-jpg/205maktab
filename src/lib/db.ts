/**
 * PostgreSQL (Supabase) bağlantı hovuzu və parametrləşdirilmiş sorğu yardımçıları.
 *
 * Kod `?` yer tutucuları ilə yazılır; göndərilməzdən əvvəl Postgres-in `$1, $2, ...` formasına
 * çevrilir (SQL injection-a qarşı dəyərlər həmişə ayrıca göndərilir). Massiv parametr
 * `IN (?)` üçün siyahıya, massivlər massivi isə `VALUES ?` üçün sətirlərə açılır (mysql2 ilə eyni).
 *
 * Qaytarılan dəyərlər MySQL dövrü ilə eyni formadadır:
 *  - DATE → "YYYY-MM-DD", TIMESTAMP → "YYYY-MM-DD HH:MM:SS", TIMESTAMPTZ → Bakı vaxtı ilə "YYYY-MM-DD HH:MM:SS"
 *  - COUNT(*) (bigint) → number, NUMERIC → string
 * Bakı (Asia/Baku) 2016-dan bəri sabit UTC+04:00-dır (yay vaxtı yoxdur).
 */
import "server-only";
import pg from "pg";
import { env } from "./env";
import { toBakuTimestamp, toPg } from "./sql-params";

export { toBakuTimestamp, toPg };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = any[];

pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (v) => v.slice(0, 19));
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, toBakuTimestamp);

const g = globalThis as unknown as { __q205Pool?: pg.Pool };

export function getPool(): pg.Pool {
  if (!g.__q205Pool) {
    const cfg = env.db;
    const pool = new pg.Pool({
      connectionString: cfg.url,
      ssl: cfg.ssl,
      max: cfg.poolSize,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    pool.on("error", (err) => console.error("[db] boş bağlantı xətası:", err.message));
    g.__q205Pool = pool;
  }
  return g.__q205Pool;
}

export interface ExecResult {
  /** INSERT ... RETURNING ilə qayıdan ilk sətrin id-si (yoxdursa 0) */
  insertId: number;
  affectedRows: number;
  rows: Row[];
}

export interface Db {
  query<T = Row>(sql: string, params?: Params): Promise<T[]>;
  queryOne<T = Row>(sql: string, params?: Params): Promise<T | null>;
  execute(sql: string, params?: Params): Promise<ExecResult>;
}

type Runner = Pick<pg.Pool | pg.PoolClient, "query">;

const INSERT_RE = /^\s*INSERT\b/i;
const RETURNING_RE = /\bRETURNING\b/i;

function wrap(getRunner: () => Runner): Db {
  return {
    async query<T = Row>(sql: string, params: Params = []) {
      const { text, values } = toPg(sql, params);
      const res = await getRunner().query(text, values);
      return res.rows as T[];
    },
    async queryOne<T = Row>(sql: string, params: Params = []) {
      const { text, values } = toPg(sql, params);
      const res = await getRunner().query(text, values);
      return res.rows.length ? (res.rows[0] as T) : null;
    },
    async execute(sql: string, params: Params = []) {
      // MySQL insertId əvəzinə: INSERT-lərə avtomatik RETURNING * əlavə olunur
      const stmt = INSERT_RE.test(sql) && !RETURNING_RE.test(sql) ? `${sql.trimEnd()} RETURNING *` : sql;
      const { text, values } = toPg(stmt, params);
      const res = await getRunner().query(text, values);
      const first = res.rows[0] as { id?: unknown } | undefined;
      return { insertId: first?.id != null ? Number(first.id) : 0, affectedRows: res.rowCount ?? 0, rows: res.rows };
    },
  };
}

export const db: Db = wrap(() => getPool());

/** Tranzaksiya: callback xəta atarsa ROLLBACK edilir. */
export async function transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(wrap(() => client));
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* bağlantı artıq qırılıbsa */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Postgres: 23505 unique_violation */
export function isDuplicateError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: string }).code === "23505");
}

/** Postgres: yanlış formatlı və ya diapazondan kənar giriş dəyəri (məs. "abc" rəqəm sütununa) */
export function isInvalidInputError(err: unknown): boolean {
  const code = err && typeof err === "object" ? (err as { code?: string }).code : "";
  return code === "22P02" || code === "22007" || code === "22008" || code === "22003" || code === "23514";
}

/** Postgres: 23503 foreign_key_violation */
export function isForeignKeyError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: string }).code === "23503");
}
