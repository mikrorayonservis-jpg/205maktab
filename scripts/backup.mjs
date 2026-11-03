// Ehtiyat nüsxə: MySQL dump (mysqldump) + storage/ fayllarının surəti.
// Parol prosess siyahısında görünməsin deyə müvəqqəti, yalnız sahibin oxuya biləcəyi option faylı istifadə olunur.
// İstifadə: npm run backup     (BACKUP_DIR, BACKUP_KEEP, MYSQLDUMP_PATH dəyişənləri ilə idarə olunur)
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { loadEnv, dbConfig, ROOT } from "./lib/env.mjs";

loadEnv();
const cfg = dbConfig();
const backupRoot = path.resolve(ROOT, process.env.BACKUP_DIR || "backups");
const keep = Number(process.env.BACKUP_KEEP || 14);
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const target = path.join(backupRoot, stamp);

function optionFile() {
  const file = path.join(os.tmpdir(), `q205-${process.pid}-${Date.now()}.cnf`);
  fs.writeFileSync(file, `[client]\nhost=${cfg.host}\nport=${cfg.port}\nuser=${cfg.user}\npassword="${cfg.password.replace(/"/g, '\\"')}"\n`, { mode: 0o600 });
  return file;
}

async function dump() {
  const opt = optionFile();
  const out = fs.createWriteStream(path.join(target, "database.sql"));
  const bin = process.env.MYSQLDUMP_PATH || "mysqldump";
  try {
    await new Promise((resolve, reject) => {
      const p = spawn(bin, [`--defaults-extra-file=${opt}`, "--single-transaction", "--routines", "--triggers", "--default-character-set=utf8mb4", "--set-gtid-purged=OFF", cfg.database], { stdio: ["ignore", "pipe", "pipe"] });
      p.stdout.pipe(out);
      let err = "";
      p.stderr.on("data", (d) => (err += d));
      p.on("error", (e) => reject(new Error(`mysqldump işə salınmadı (${e.message}). MYSQLDUMP_PATH dəyişənini təyin edin.`)));
      p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err || `mysqldump kodu ${code}`))));
    });
  } finally {
    fs.rmSync(opt, { force: true });
  }
}

async function run() {
  fs.mkdirSync(target, { recursive: true });
  await dump();
  const storage = path.resolve(ROOT, process.env.STORAGE_DIR || "storage");
  if (fs.existsSync(storage)) fs.cpSync(storage, path.join(target, "storage"), { recursive: true });
  fs.writeFileSync(path.join(target, "manifest.json"), JSON.stringify({ created: new Date().toISOString(), database: cfg.database, storage: fs.existsSync(storage) }, null, 2));
  const all = fs.readdirSync(backupRoot).filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d)).sort();
  for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.rmSync(path.join(backupRoot, old), { recursive: true, force: true });
  const size = fs.statSync(path.join(target, "database.sql")).size;
  console.log(`[backup] Hazırdır: ${target} (DB: ${(size / 1024).toFixed(0)} KB). Saxlanılan nüsxə sayı: ${Math.min(all.length, keep)}`);
}

run().catch((e) => { console.error("[backup] Xəta:", e.message); fs.rmSync(target, { recursive: true, force: true }); process.exit(1); });
