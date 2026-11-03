/**
 * MySQL bağlantı hovuzu və parametrləşdirilmiş sorğu yardımçıları.
 * Bütün sorğular `?` yer tutucuları ilə göndərilir (SQL injection-a qarşı).
 * Tarixlər sətir kimi qaytarılır (dateStrings) və sessiya saat qurşağı Asia/Baku (+04:00) olur.
 */
import "server-only";
import mysql from "mysql2/promise";
import type { Pool, PoolConnection, ResultSetHeader } from "mysql2/promise";
import { env } from "./env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = any[];

const g = globalThis as unknown as { __q205Pool?: Pool };

export function getPool(): Pool {
  if (!g.__q205Pool) {
    const cfg = env.db;
    const pool = mysql.createPool({
      ...cfg,
      charset: "utf8mb4",
      timezone: "+04:00",
      dateStrings: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
      waitForConnections: true,
      enableKeepAlive: true,
      supportBigNumbers: true,
      bigNumberStrings: false,
    });
    pool.on("connection", (conn) => {
      conn.query("SET time_zone = '+04:00'");
    });
    g.__q205Pool = pool;
  }
  return g.__q205Pool;
}

export interface Db {
  query<T = Row>(sql: string, params?: Params): Promise<T[]>;
  queryOne<T = Row>(sql: string, params?: Params): Promise<T | null>;
  execute(sql: string, params?: Params): Promise<ResultSetHeader>;
}

function wrap(runner: Pool | PoolConnection): Db {
  return {
    async query<T = Row>(sql: string, params: Params = []) {
      const [rows] = await runner.query(sql, params);
      return rows as T[];
    },
    async queryOne<T = Row>(sql: string, params: Params = []) {
      const [rows] = await runner.query(sql, params);
      const list = rows as T[];
      return list.length ? list[0] : null;
    },
    async execute(sql: string, params: Params = []) {
      const [res] = await runner.query(sql, params);
      return res as ResultSetHeader;
    },
  };
}

export const db: Db = {
  query: (sql, params) => wrap(getPool()).query(sql, params),
  queryOne: (sql, params) => wrap(getPool()).queryOne(sql, params),
  execute: (sql, params) => wrap(getPool()).execute(sql, params),
} as Db;

/** Tranzaksiya: callback xəta atarsa ROLLBACK edilir. */
export async function transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(wrap(conn));
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* bağlantı artıq qırılıbsa */
    }
    throw err;
  } finally {
    conn.release();
  }
}

export function isDuplicateError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: string }).code === "ER_DUP_ENTRY");
}

export function isForeignKeyError(err: unknown): boolean {
  const code = err && typeof err === "object" ? (err as { code?: string }).code : "";
  return code === "ER_ROW_IS_REFERENCED_2" || code === "ER_NO_REFERENCED_ROW_2";
}
