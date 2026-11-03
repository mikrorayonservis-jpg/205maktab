// Ehtiyat nüsxə: Postgres dump (pg_dump, custom format, yalnız public sxemi) + yüklənmiş faylların surəti
// (Supabase Storage bucket-ı və ya lokal storage/ qovluğu).
// Parol komanda sətrində görünməsin deyə PGPASSWORD mühit dəyişəni ilə ötürülür.
// İstifadə: npm run backup     (BACKUP_DIR, BACKUP_KEEP, PG_DUMP_PATH dəyişənləri ilə idarə olunur)
// Qeyd: pg_dump versiyası Supabase Postgres versiyasından köhnə olmamalıdır.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadEnv, dbConfig, ROOT } from "./lib/env.mjs";
import { getObject, listKeys, storageTarget } from "./lib/storage.mjs";

loadEnv();
const cfg = dbConfig();
const backupRoot = path.resolve(ROOT, process.env.BACKUP_DIR || "backups");
const keep = Number(process.env.BACKUP_KEEP || 14);
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const target = path.join(backupRoot, stamp);

function pgEnv(c) {
  return {
    ...process.env,
    PGHOST: c.url.hostname,
    PGPORT: c.url.port || "5432",
    PGUSER: decodeURIComponent(c.url.username),
    PGPASSWORD: decodeURIComponent(c.url.password),
    PGDATABASE: c.database,
    PGSSLMODE: c.ssl ? "require" : "disable",
  };
}

async function dump() {
  const bin = process.env.PG_DUMP_PATH || "pg_dump";
  await new Promise((resolve, reject) => {
    const p = spawn(bin, ["--format=custom", "--schema=public", "--no-owner", "--no-privileges", `--file=${path.join(target, "database.dump")}`], {
      env: pgEnv(cfg),
      stdio: ["ignore", "inherit", "pipe"],
    });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => reject(new Error(`pg_dump işə salınmadı (${e.message}). PostgreSQL client alətlərini quraşdırın və ya PG_DUMP_PATH təyin edin.`)));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err || `pg_dump kodu ${code}`))));
  });
}

async function copyFiles() {
  const store = storageTarget();
  const dest = path.join(target, "storage");
  if (store.kind === "local") {
    if (!fs.existsSync(store.dir)) return 0;
    fs.cpSync(store.dir, dest, { recursive: true });
    return fs.readdirSync(dest, { recursive: true }).length;
  }
  const keys = await listKeys(store);
  for (const key of keys) {
    const file = path.join(dest, key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, await getObject(store, key));
  }
  return keys.length;
}

async function run() {
  fs.mkdirSync(target, { recursive: true });
  await dump();
  const files = await copyFiles();
  fs.writeFileSync(
    path.join(target, "manifest.json"),
    JSON.stringify({ created: new Date().toISOString(), host: cfg.host, database: cfg.database, format: "pg_dump-custom", files, storage: storageTarget().label }, null, 2)
  );
  const all = fs.readdirSync(backupRoot).filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d)).sort();
  for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.rmSync(path.join(backupRoot, old), { recursive: true, force: true });
  const size = fs.statSync(path.join(target, "database.dump")).size;
  console.log(`[backup] Hazırdır: ${target} (DB: ${(size / 1024).toFixed(0)} KB, fayl: ${files}). Saxlanılan nüsxə sayı: ${Math.min(all.length, keep)}`);
}

run().catch((e) => {
  console.error("[backup] Xəta:", e.message);
  fs.rmSync(target, { recursive: true, force: true });
  process.exit(1);
});
