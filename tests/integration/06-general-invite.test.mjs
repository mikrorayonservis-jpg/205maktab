// Ümumi qeydiyyat kodu (REGISTRATION_INVITE_CODE): yalnız qeydiyyata icazə verir, heç bir rol və səlahiyyət vermir.
// run.mjs serveri REGISTRATION_INVITE_CODE=test-umumi-kod və REGISTRATION_AUTO_VERIFY=1 ilə işə salır.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Client, login, q, closeDb } from "./helpers.mjs";

after(closeDb);
const PW = "Umumi-Kod-2026x";
const reg = (email, code = "TEST-UMUMI-KOD", password = PW) =>
  new Client().post("/api/auth/register", { code, email, firstName: "Test", lastName: "İstifadəçi", password, passwordConfirm: password });

test("ümumi kodla qeydiyyat: hesab rolsuz yaranır, daxil olur, admin səlahiyyəti yoxdur", async () => {
  const r = await reg("umumi1@demo.local");
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const [u] = await q("SELECT id, role, email_verified FROM users WHERE email = 'umumi1@demo.local'");
  assert.equal(u.role, "pending");
  assert.equal(Number(u.email_verified), 1);
  assert.equal((await q("SELECT COUNT(*) AS n FROM user_roles WHERE user_id = ?", [u.id]))[0].n, 0, "kod heç bir rol verməməlidir");

  const c = await login("umumi1@demo.local", PW);
  const me = await c.get("/api/auth/me");
  assert.deepEqual(me.body.data.user?.roles ?? me.body.data.roles, []);
  assert.equal((await c.raw("/admin")).status, 404);
  assert.equal((await c.get("/api/admin/users")).status, 403);
  assert.equal((await c.get("/api/grades")).body.data?.length ?? 0, 0, "rolsuz istifadəçi qiymət görməməlidir");
  const dash = await (await c.raw("/dashboard")).text();
  assert.match(dash, /rol təyinatı gözləyir/);
});

test("ümumi kod: yanlış kod, zəif parol və təkrar e-poçt rədd edilir; kod gizli qalır", async () => {
  assert.equal((await reg("umumi2@demo.local", "YANLIS-KOD")).status, 400);
  assert.equal((await reg("umumi3@demo.local", "test-umumi-kod", "zeif")).status, 422);
  assert.equal((await reg("umumi1@demo.local")).status, 409);
  assert.equal((await reg("umumi4@demo.local", "test umumi kod")).status, 201, "kod registr və boşluqlardan asılı deyil");
  const html = await (await new Client().raw("/register")).text();
  assert.ok(!html.toLowerCase().includes("test-umumi-kod"), "kod səhifəyə düşməməlidir");
});

test("parol siyasəti: hərflərdən ibarət parol qəbul edilir (yalnız rəqəm məhdudiyyəti yoxdur), qısa və geniş yayılmış parol rədd edilir", async () => {
  const letters = "mekteb-ve-ailə";
  assert.equal((await reg("umumi5@demo.local", "test-umumi-kod", letters)).status, 201);
  assert.equal((await login("umumi5@demo.local", letters)).constructor.name, "Client");
  assert.equal((await reg("umumi6@demo.local", "test-umumi-kod", "abc12")).status, 422);
  assert.equal((await reg("umumi7@demo.local", "test-umumi-kod", "12345678")).status, 422);
  assert.equal((await q("SELECT COUNT(*) AS n FROM users WHERE email IN ('umumi6@demo.local', 'umumi7@demo.local')"))[0].n, 0);
});
