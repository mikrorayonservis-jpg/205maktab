// Tam yoxlama lokal, yaddaşdakı test bazası ilə (Supabase-ə toxunmur):
//   typecheck → unit testlər → next build → inteqrasiya testləri (PGlite Postgres, 127.0.0.1).
// Nəticə ekrana və test-results/verify-local.txt faylına yazılır.
// İstifadə: npm run verify:local
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { ROOT } from "./lib/env.mjs";

const PG_PORT = Number(process.env.VERIFY_PG_PORT || 5434);
const URL_TEST = `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`;
const isWin = process.platform === "win32";
fs.mkdirSync(path.join(ROOT, "test-results"), { recursive: true });
const logFile = path.join(ROOT, "test-results", "verify-local.txt");
const log = fs.createWriteStream(logFile);
const out = (s) => { process.stdout.write(s); log.write(s); };
const portOpen = (port) => new Promise((r) => { const s = net.connect(port, "127.0.0.1"); s.on("connect", () => { s.end(); r(true); }); s.on("error", () => r(false)); });

function run(label, cmd, args, env = {}) {
  return new Promise((resolve) => {
    out(`\n===== ${label} =====\n`);
    const t = Date.now();
    const p = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, shell: isWin && /\.cmd$/.test(cmd) });
    p.stdout.on("data", (d) => out(d.toString()));
    p.stderr.on("data", (d) => out(d.toString()));
    p.on("exit", (code) => { out(`----- ${label}: ${code === 0 ? "OK" : `XƏTA (kod ${code})`} · ${((Date.now() - t) / 1000).toFixed(1)} s\n`); resolve(code ?? 1); });
  });
}

out(`Yoxlama: ${new Date().toISOString()} · node ${process.version}\n`);
const npm = isWin ? "npm.cmd" : "npm";
const results = {};
results.typecheck = await run("typecheck", npm, ["run", "typecheck"]);
results.unit = await run("unit testlər", npm, ["run", "test:unit"]);
results.build = await run("build", npm, ["run", "build"]);

let pg;
if (results.build === 0) {
  if (await portOpen(PG_PORT)) { out(`${PG_PORT} portu məşğuldur — VERIFY_PG_PORT təyin edin.\n`); process.exit(1); }
  out(`\n▶ Test Postgres (PGlite, yaddaşda) ${PG_PORT} portunda\n`);
  pg = spawn(isWin ? "npx.cmd" : "npx", ["--yes", "-p", "@electric-sql/pglite-socket", "pglite-server", `--port=${PG_PORT}`, "--max-connections=20"], { cwd: ROOT, stdio: "ignore", shell: isWin });
  for (let i = 0; i < 120 && !(await portOpen(PG_PORT)); i++) await new Promise((r) => setTimeout(r, 500));
  results.integration = await run("inteqrasiya testləri", npm, ["run", "test:integration"], { DATABASE_URL_TEST: URL_TEST });
  try { pg.kill(); } catch { /* */ }
}
out(`\n===== XÜLASƏ =====\n${Object.entries(results).map(([k, v]) => `${k.padEnd(12)} ${v === 0 ? "OK" : "XƏTA"}`).join("\n")}\nLog: ${logFile}\n`);
log.end();
process.exit(Object.values(results).every((v) => v === 0) ? 0 : 1);
