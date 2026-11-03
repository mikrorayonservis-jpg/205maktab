// Bərpa: seçilmiş ehtiyat nüsxədən public sxemi (pg_restore) və yüklənmiş fayllar bərpa olunur.
// Təsdiq üçün server ünvanı və baza adını yazmaq tələb olunur. Bərpadan sonra `npm run db:migrate` icra edin.
// İstifadə: npm run restore -- --from=backups/2026-11-02-10-00-00 [--test]
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { loadEnv, dbConfig, ROOT, isTestFlag } from "./lib/env.mjs";
import { putObject, storageTarget } from "./lib/storage.mjs";
import { MIME_BY_EXT } from "./lib/mime.mjs";

loadEnv();
const test = isTestFlag();
const cfg = dbConfig({ test });
const from = process.argv.find((a) => a.startsWith("--from="))?.split("=")[1];
if (!from) {
  console.error("İstifadə: npm run restore -- --from=backups/<qovluq>");
  process.exit(1);
}
const dir = path.resolve(ROOT, from);
const dumpFile = path.join(dir, "database.dump");
if (!fs.existsSync(dumpFile)) {
  console.error(`[restore] ${dumpFile} tapılmadı.`);
  process.exit(1);
}

const expected = `${cfg.host}/${cfg.database}`;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise((r) => rl.question(`DİQQƏT: "${expected}" bazasının public sxemi ehtiyat nüsxə ilə ƏVƏZ olunacaq. Təsdiq üçün "${expected}" yazın: `, r));
rl.close();
if (answer.trim() !== expected) {
  console.log("[restore] Ləğv edildi.");
  process.exit(0);
}

const env = {
  ...process.env,
  PGHOST: cfg.url.hostname,
  PGPORT: cfg.url.port || "5432",
  PGUSER: decodeURIComponent(cfg.url.username),
  PGPASSWORD: decodeURIComponent(cfg.url.password),
  PGDATABASE: cfg.database,
  PGSSLMODE: cfg.ssl ? "require" : "disable",
};
await new Promise((resolve, reject) => {
  const p = spawn(process.env.PG_RESTORE_PATH || "pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--single-transaction", `--dbname=${cfg.database}`, dumpFile], {
    env,
    stdio: ["ignore", "inherit", "pipe"],
  });
  let err = "";
  p.stderr.on("data", (d) => (err += d));
  p.on("error", (e) => reject(new Error(`pg_restore işə salınmadı (${e.message}). PG_RESTORE_PATH təyin edin.`)));
  p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err || `pg_restore kodu ${code}`))));
});

const storageBackup = path.join(dir, "storage");
if (fs.existsSync(storageBackup)) {
  const store = storageTarget();
  const files = fs.readdirSync(storageBackup, { recursive: true }).map(String).filter((f) => fs.statSync(path.join(storageBackup, f)).isFile());
  for (const rel of files) {
    const key = rel.split(path.sep).join("/");
    await putObject(store, key, fs.readFileSync(path.join(storageBackup, rel)), MIME_BY_EXT[path.extname(key).slice(1).toLowerCase()] || "application/octet-stream", { upsert: true });
  }
  console.log(`[restore] ${files.length} fayl bərpa olundu → ${store.label}`);
}
console.log("[restore] Bərpa tamamlandı. İndi `npm run db:migrate` icra edin (RLS və rolları yoxlayır), sonra tətbiqi yenidən başladın.");
