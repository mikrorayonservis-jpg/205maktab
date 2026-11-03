// Bərpa: seçilmiş ehtiyat nüsxədən DB və storage/ bərpa olunur. Təsdiq üçün baza adını yazmaq tələb olunur.
// İstifadə: npm run restore -- --from=backups/2026-11-02-10-00-00 [--test]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { loadEnv, dbConfig, ROOT, isTestFlag } from "./lib/env.mjs";

loadEnv();
const test = isTestFlag();
const cfg = dbConfig({ test });
const from = process.argv.find((a) => a.startsWith("--from="))?.split("=")[1];
if (!from) {
  console.error("İstifadə: npm run restore -- --from=backups/<qovluq>");
  process.exit(1);
}
const dir = path.resolve(ROOT, from);
const sql = path.join(dir, "database.sql");
if (!fs.existsSync(sql)) {
  console.error(`[restore] ${sql} tapılmadı.`);
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise((r) => rl.question(`DİQQƏT: "${cfg.database}" bazası ehtiyat nüsxə ilə əvəz olunacaq. Təsdiq üçün baza adını yazın: `, r));
rl.close();
if (answer.trim() !== cfg.database) {
  console.log("[restore] Ləğv edildi.");
  process.exit(0);
}

const opt = path.join(os.tmpdir(), `q205-r-${process.pid}.cnf`);
fs.writeFileSync(opt, `[client]\nhost=${cfg.host}\nport=${cfg.port}\nuser=${cfg.user}\npassword="${cfg.password.replace(/"/g, '\\"')}"\n`, { mode: 0o600 });
try {
  await new Promise((resolve, reject) => {
    const p = spawn(process.env.MYSQL_PATH || "mysql", [`--defaults-extra-file=${opt}`, "--default-character-set=utf8mb4", cfg.database], { stdio: ["pipe", "inherit", "pipe"] });
    fs.createReadStream(sql).pipe(p.stdin);
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => reject(new Error(`mysql işə salınmadı (${e.message}). MYSQL_PATH dəyişənini təyin edin.`)));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err || `mysql kodu ${code}`))));
  });
} finally {
  fs.rmSync(opt, { force: true });
}
const storageBackup = path.join(dir, "storage");
if (fs.existsSync(storageBackup)) {
  const storage = path.resolve(ROOT, process.env.STORAGE_DIR || "storage");
  fs.cpSync(storageBackup, storage, { recursive: true });
}
console.log("[restore] Bərpa tamamlandı. Tətbiqi yenidən başladın.");
