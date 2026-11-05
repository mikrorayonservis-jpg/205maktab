// Lokal TEST mühiti: yaddaşda işləyən Postgres (PGlite) + miqrasiyalar + demo məktəb + test admin hesabı + `next dev`.
// Supabase/production bazasına HEÇ VAXT qoşulmur: DATABASE_URL yalnız bu proses üçün 127.0.0.1-ə yönəldilir.
// Server dayandıqda bütün məlumatlar silinir (yaddaşdadır).
//
// İstifadə:  npm run dev:local
//   - Test admin e-poçtu: TEST_ADMIN_EMAIL (defolt admin@205mekteb.test)
//   - Parol: TEST_ACCOUNT_PASSWORD mühit dəyişənindən və ya gizli sorğu ilə (heç yerdə yazılmır, çap olunmur).
//   - Şagird hesabı əl ilə yaradılmır: /register səhifəsində ekrana çıxan 10B sinif kodu ilə qeydiyyatdan keçin
//     (sinif kodu sistemini real axınla yoxlamaq üçün).
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { hash } from "@node-rs/argon2";
import { loadEnv, connect, ROOT } from "./lib/env.mjs";
import { createDemoSchool } from "./lib/demo-data.mjs";

loadEnv();
const require = createRequire(import.meta.url);
const PG_PORT = Number(process.env.LOCAL_PG_PORT || 5433);
const APP_PORT = Number(process.env.PORT || 3000);
const LOCAL_URL = process.env.DEV_LOCAL_EXISTING_PG === "1" && process.env.DEV_LOCAL_URL ? process.env.DEV_LOCAL_URL : `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`;
const ADMIN_EMAIL = (process.env.TEST_ADMIN_EMAIL || "admin@205mekteb.test").toLowerCase();
const isWin = process.platform === "win32";
const children = [];
const stopAll = () => children.forEach((c) => { try { c.kill(); } catch { /* */ } });
process.on("exit", stopAll);
process.on("SIGINT", () => process.exit(0));

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (a) => { rl.close(); process.stdout.write("\n"); resolve(a); });
  });
}

const portOpen = (port) => new Promise((r) => { const s = net.connect(port, "127.0.0.1"); s.on("connect", () => { s.end(); r(true); }); s.on("error", () => r(false)); });

const password = process.env.TEST_ACCOUNT_PASSWORD || (await askHidden(`${ADMIN_EMAIL} üçün parol (görünmür): `));
if (!password || password.length < 6) { console.error("Parol boşdur və ya çox qısadır."); process.exit(1); }

const useExisting = process.env.DEV_LOCAL_EXISTING_PG === "1"; // yalnız avtomatik testlər üçün: artıq işləyən lokal Postgres
if (!useExisting && (await portOpen(PG_PORT))) {
  console.error(`${PG_PORT} portu artıq məşğuldur. Köhnə lokal serveri bağlayın və ya LOCAL_PG_PORT təyin edin.`);
  process.exit(1);
}
if (!useExisting) {
console.log(`▶ Lokal Postgres (PGlite, yaddaşda) ${PG_PORT} portunda başladılır…`);
const pgProc = spawn(isWin ? "npx.cmd" : "npx", ["--yes", "-p", "@electric-sql/pglite-socket", "pglite-server", `--port=${PG_PORT}`, "--max-connections=20"], { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"], shell: isWin });
children.push(pgProc);
for (let i = 0; i < 120 && !(await portOpen(PG_PORT)); i++) await new Promise((r) => setTimeout(r, 500));
}
if (!(await portOpen(PG_PORT))) { console.error("PGlite serveri başlamadı."); process.exit(1); }

process.env.DATABASE_URL_TEST = LOCAL_URL;
console.log("▶ Miqrasiyalar…");
await new Promise((resolve, reject) => {
  const m = spawn(process.execPath, [path.join(ROOT, "scripts", "db-migrate.mjs"), "--test"], { cwd: ROOT, stdio: "inherit", env: { ...process.env, DATABASE_URL_TEST: LOCAL_URL } });
  m.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("miqrasiya xətası"))));
});

console.log("▶ Demo məktəb və test admin hesabı…");
const conn = await connect({ test: true });
const demoPw = `D-${(await import("node:crypto")).randomBytes(9).toString("base64url")}9a`;
const ids = await createDemoSchool(conn, demoPw);
const [ex] = (await conn.query("SELECT id FROM users WHERE email = ?", [ADMIN_EMAIL]))[0];
if (!ex) {
  const pwHash = await hash(password, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const [u] = await conn.query(
    `INSERT INTO users (email, first_name, last_name, password_hash, role, is_active, email_verified, email_verified_at, password_changed_at)
     VALUES (?, 'Test', 'Admin', ?, 'school_admin', 1, 1, NOW(), NOW())`,
    [ADMIN_EMAIL, pwHash]
  );
  await conn.query("INSERT INTO user_roles (user_id, role_id) SELECT ?::int, id FROM roles WHERE code = 'school_admin'", [u.insertId]);
}
// 10B sinfi və onun dəvət kodu (tətbiqin öz kod formatı ilə)
const { generateClassCode, normalizeClassCode } = await loadClassCodes();
let [[cls]] = await conn.query("SELECT id FROM classes WHERE name = '10B' AND school_year_id = ?", [ids.yearId]);
let code;
if (!cls) {
  const [c] = await conn.query("INSERT INTO classes (name, grade_level, school_year_id, shift) VALUES ('10B', 10, ?, 1)", [ids.yearId]);
  cls = { id: c.insertId };
  code = generateClassCode("10B");
  await conn.query("INSERT INTO class_invite_codes (class_id, code, code_norm) VALUES (?, ?, ?)", [cls.id, code, normalizeClassCode(code)]);
} else {
  code = (await conn.query("SELECT code FROM class_invite_codes WHERE class_id = ? AND revoked_at IS NULL", [cls.id]))[0][0]?.code;
}
await conn.end();

console.log(`\n✔ Lokal test bazası hazırdır (Supabase-ə toxunulmayıb).`);
console.log(`  Admin:            ${ADMIN_EMAIL}  (daxil etdiyiniz parol)`);
console.log(`  10B sinif kodu:   ${code}   → şagird hesabını http://localhost:${APP_PORT}/register səhifəsində bu kodla yaradın`);
console.log(`▶ next dev http://localhost:${APP_PORT}\n`);

if (process.env.DEV_LOCAL_NO_SERVER === "1") process.exit(0);
// OneDrive qovluğunda köhnə .next "EINVAL readlink" xətası verir (npm run dev-dəki predev ilə eyni təmizləmə)
fs.rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
const nextBin = require.resolve("next/dist/bin/next");
const dev = spawn(process.execPath, [nextBin, "dev", "-p", String(APP_PORT)], {
  cwd: ROOT,
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: LOCAL_URL,
    DATABASE_SSL: "disable",
    SUPABASE_SECRET_KEY: "",
    STORAGE_DIR: "storage-test",
    SMTP_HOST: "",
    REGISTRATION_AUTO_VERIFY: "1",
    SITE_URL: `http://localhost:${APP_PORT}`,
    TEST_ACCOUNT_PASSWORD: "",
  },
});
children.push(dev);
dev.on("exit", (c) => process.exit(c ?? 0));

/** src/lib/class-codes.ts ilə eyni qayda (skript TypeScript yükləmir) */
async function loadClassCodes() {
  const crypto = await import("node:crypto");
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const limit = 256 - (256 % ALPHABET.length);
  return {
    generateClassCode(name) {
      let s = "";
      while (s.length < 5) for (const b of crypto.randomBytes(10)) if (b < limit && s.length < 5) s += ALPHABET[b % ALPHABET.length];
      return `205-${name.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${s}`;
    },
    normalizeClassCode: (c) => c.toUpperCase().replace(/[^A-Z0-9]/g, ""),
  };
}
