// Skriptlər üçün ortaq mühit yükləyicisi və DB bağlantısı. Heç bir default parol saxlanmır.
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

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

export function dbConfig({ test = false } = {}) {
  const database = test ? requireEnv("DB_NAME_TEST") : requireEnv("DB_NAME");
  if (test && !/_test$/.test(database)) {
    console.error("[xəta] Test bazasının adı '_test' ilə bitməlidir (DB_NAME_TEST).");
    process.exit(1);
  }
  return {
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database,
    charset: "utf8mb4",
    timezone: "+04:00",
    dateStrings: true,
  };
}

export async function connect(opts = {}) {
  const cfg = dbConfig(opts);
  const conn = await mysql.createConnection({ ...cfg, multipleStatements: true });
  await conn.query("SET time_zone = '+04:00'");
  return conn;
}

export async function ensureDatabase(opts = {}) {
  const cfg = dbConfig(opts);
  const { database, ...rest } = cfg;
  const conn = await mysql.createConnection(rest);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
}

export const isTestFlag = () => process.argv.includes("--test");
