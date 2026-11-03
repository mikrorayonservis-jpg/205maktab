// İnteqrasiya testlərinin icraçısı:
//  1) Test bazasında miqrasiyaları icra edir və cədvəlləri təmizləyir (yalnız DATABASE_URL_TEST: lokal və ya *_test bazası!)
//  2) Demo məktəb strukturunu təsadüfi parolla yaradır
//  3) `next start` ilə production build-i 3105 portunda işə salır
//  4) tests/integration/*.test.mjs fayllarını node:test ilə icra edir
// Əvvəlcə `npm run build` icra edilməlidir.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { loadEnv, connect, dbConfig, ROOT } from "../../scripts/lib/env.mjs";
import { createDemoSchool } from "../../scripts/lib/demo-data.mjs";

loadEnv();
const require = createRequire(import.meta.url);
const PORT = Number(process.env.TEST_PORT || 3105);
const BASE = `http://localhost:${PORT}`;
const testCfg = dbConfig({ test: true }); // lokal və ya "_test" bazası deyilsə dayanır
const testUrl = process.env.DATABASE_URL_TEST;
if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
  console.error("Production build tapılmadı. Əvvəlcə: npm run build");
  process.exit(1);
}

console.log("▶ Test bazası hazırlanır:", `${testCfg.host}/${testCfg.database}`);
const mig = spawnSync(process.execPath, [path.join(ROOT, "scripts", "db-migrate.mjs"), "--test"], { stdio: "inherit", cwd: ROOT });
if (mig.status !== 0) process.exit(mig.status ?? 1);

const conn = await connect({ test: true });
const KEEP = new Set(["schema_migrations", "roles", "permissions", "role_permissions", "bell_times"]);
const [tables] = await conn.query("SELECT tablename AS t FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
const wipe = tables.map((r) => r.t).filter((t) => !KEEP.has(t));
if (wipe.length) await conn.exec(`TRUNCATE TABLE ${wipe.map((t) => `public."${t}"`).join(", ")} RESTART IDENTITY`);
const password = `T-${crypto.randomBytes(9).toString("base64url")}9a`;
const ids = await createDemoSchool(conn, password);
await conn.end();

const storageDir = path.join(ROOT, "storage-test");
fs.rmSync(storageDir, { recursive: true, force: true });

console.log("▶ Server işə salınır:", BASE);
const nextBin = require.resolve("next/dist/bin/next");
const server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, DATABASE_URL: testUrl, STORAGE_DIR: "storage-test", SUPABASE_SECRET_KEY: "", VERCEL: "", SITE_URL: BASE, SMTP_HOST: "", NODE_ENV: "production", TRUST_PROXY: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

const stop = () => {
  try {
    server.kill();
  } catch {
    /* artıq dayanıb */
  }
};
process.on("exit", stop);

let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try {
    const r = await fetch(`${BASE}/api/auth/me`);
    ready = r.status === 200;
  } catch {
    /* hələ hazır deyil */
  }
}
if (!ready) {
  console.error("Server 60 saniyədə hazır olmadı.\n", serverLog.slice(-3000));
  stop();
  process.exit(1);
}

console.log("▶ Testlər icra olunur\n");
const files = fs.readdirSync(path.join(ROOT, "tests", "integration")).filter((f) => f.endsWith(".test.mjs")).map((f) => path.join("tests", "integration", f));
const res = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "--test-reporter=spec", ...files], {
  cwd: ROOT,
  stdio: ["ignore", "pipe", "inherit"],
  env: { ...process.env, TEST_BASE_URL: BASE, TEST_PASSWORD: password, TEST_IDS: JSON.stringify(ids), DATABASE_URL: "" },
  encoding: "utf8",
});
process.stdout.write(res.stdout || "");
fs.mkdirSync(path.join(ROOT, "test-results"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "test-results", "integration.txt"), (res.stdout || "") + "\n\n--- server log (son 5000 simvol) ---\n" + serverLog.slice(-(Number(process.env.TEST_LOG_CHARS) || 5000)));
console.log("\nNəticə faylı: test-results/integration.txt");
stop();
process.exit(res.status ?? 1);
