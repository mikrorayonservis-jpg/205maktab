import { test, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, Client, PASSWORD, login, q, closeDb } from "./helpers.mjs";

after(closeDb);

test("uğurlu giriş HttpOnly sessiya cookie-si qaytarır", async () => {
  const c = new Client();
  const res = await c.raw("/api/auth/login", { method: "POST", body: { email: "sagird1@demo.local", password: PASSWORD } });
  assert.equal(res.status, 200);
  const sid = res.headers.getSetCookie().find((h) => /q205_sid=/.test(h));
  assert.ok(sid, "sessiya cookie-si yoxdur");
  assert.match(sid, /HttpOnly/i);
  assert.match(sid, /SameSite=lax/i);
  const me = await c.get("/api/auth/me");
  assert.equal(me.body.data.user.email, "sagird1@demo.local");
  assert.ok(!("password_hash" in me.body.data.user));
});

test("yanlış parol və mövcud olmayan e-poçt eyni ümumi mesajı qaytarır", async () => {
  const c = new Client();
  const a = await c.post("/api/auth/login", { email: "sagird2@demo.local", password: "Yanlis-Parol-123" });
  const b = await c.post("/api/auth/login", { email: "yoxdur@demo.local", password: "Yanlis-Parol-123" });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.body.error.message, b.body.error.message);
  const rows = await q("SELECT success, reason FROM login_attempts WHERE email = 'sagird2@demo.local' ORDER BY id DESC LIMIT 1");
  assert.equal(rows[0].success, 0);
});

test("CSRF tokeni olmayan mutasiya sorğusu rədd edilir", async () => {
  const c = new Client();
  const r = await c.post("/api/auth/login", { email: "sagird1@demo.local", password: PASSWORD }, { csrf: false });
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, "CSRF");
});

test("başqa origin-dən gələn sorğu rədd edilir", async () => {
  const c = new Client();
  const r = await c.post("/api/auth/login", { email: "sagird1@demo.local", password: PASSWORD }, { origin: "https://evil.example" });
  assert.equal(r.status, 403);
});

test("çıxışdan sonra köhnə sessiya tokeni etibarsız olur", async () => {
  const c = await login("sagird2@demo.local");
  const saved = new Map(c.jar);
  assert.equal((await c.post("/api/auth/logout", {})).status, 200);
  const replay = new Client();
  replay.jar = saved;
  const me = await replay.get("/api/auth/me");
  assert.equal(me.body.data.user, null);
  const g = await replay.get("/api/grades");
  assert.equal(g.status, 401);
});

test("e-poçtu təsdiqlənməmiş hesab daxil ola bilmir", async () => {
  await q("UPDATE users SET email_verified = 0 WHERE email = 'muellif@demo.local'");
  const c = new Client();
  const r = await c.post("/api/auth/login", { email: "muellif@demo.local", password: PASSWORD });
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, "EMAIL_NOT_VERIFIED");
  await q("UPDATE users SET email_verified = 1 WHERE email = 'muellif@demo.local'");
});

test("deaktiv hesab daxil ola bilmir və sessiyaları bağlanır", async () => {
  const admin = await login("admin@demo.local");
  const victim = await login("valideyn2@demo.local");
  const [{ id }] = await q("SELECT id FROM users WHERE email = 'valideyn2@demo.local'");
  assert.equal((await admin.patch(`/api/admin/users/${id}`, { isActive: false })).status, 200);
  assert.equal((await victim.get("/api/grades")).status, 401);
  assert.equal((await new Client().post("/api/auth/login", { email: "valideyn2@demo.local", password: PASSWORD })).status, 401);
  assert.equal((await admin.patch(`/api/admin/users/${id}`, { isActive: true })).status, 200);
});

test("brute-force: eyni hesab üçün çoxlu uğursuz cəhd bloklanır (429)", async () => {
  const c = new Client();
  let last;
  for (let i = 0; i < 9; i++) last = await c.post("/api/auth/login", { email: "redaktor@demo.local", password: `Yanlis-${i}-Parol` });
  assert.equal(last.status, 429);
  await q("DELETE FROM rate_limits WHERE bucket_key LIKE 'login:%'");
  await q("UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE email = 'redaktor@demo.local'");
});

test("zəif parolla qeydiyyat və dəvət kodu olmadan qeydiyyat mümkün deyil", async () => {
  const c = new Client();
  const r = await c.post("/api/auth/register", { code: "AAAA-BBBB-CCCC", email: "yeni@demo.local", firstName: "A", lastName: "B", password: "zeif", passwordConfirm: "zeif" });
  assert.equal(r.status, 422);
  const r2 = await c.post("/api/auth/register", { code: "AAAA-BBBB-CCCC", email: "yeni@demo.local", firstName: "A", lastName: "B", password: "Guclu-Parol-2026", passwordConfirm: "Guclu-Parol-2026" });
  assert.equal(r2.status, 400);
  const u = await q("SELECT id FROM users WHERE email = 'yeni@demo.local'");
  assert.equal(u.length, 0);
});

test("qorunan səhifə sessiyasız /login-ə yönləndirir", async () => {
  const res = await fetch(`${BASE}/admin`, { redirect: "manual" });
  assert.equal(res.status, 307);
  assert.match(res.headers.get("location"), /\/login\?next=%2Fadmin/);
});

test("təhlükəsizlik başlıqları mövcuddur", async () => {
  const res = await fetch(`${BASE}/`);
  assert.match(res.headers.get("content-security-policy") || "", /default-src 'self'/);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(res.headers.get("x-powered-by"), null);
});
