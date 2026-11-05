// Qeydiyyat yoxlaması: brauzerlə server eyni sxemi (src/lib/register-schema.ts) istifadə edir.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Client, q, closeDb } from "./helpers.mjs";

after(closeDb);
const PW = "Qeyd-Yoxla-2026x";
const reg = (body) => new Client().post("/api/auth/register", { code: "TEST-UMUMI-KOD", firstName: "Test", lastName: "İstifadəçi", password: PW, passwordConfirm: PW, ...body });

test("qeydiyyat: latın olmayan e-poçt, qısa kod və uyğun gəlməyən parol sahə xətası ilə 422 qaytarır", async () => {
  const az = await reg({ email: "əli@mail.az" });
  assert.equal(az.status, 422);
  assert.match(az.body.error.fields.email, /latın hərfləri/);
  assert.equal((await q("SELECT COUNT(*) AS n FROM users WHERE email = 'əli@mail.az'"))[0].n, 0);

  const short = await reg({ email: "qisa@demo.local", code: "AB" });
  assert.equal(short.status, 422);
  assert.ok(short.body.error.fields.code);

  const mismatch = await reg({ email: "uygun@demo.local", passwordConfirm: "Basqa-Parol-2026x" });
  assert.equal(mismatch.status, 422);
  assert.ok(mismatch.body.error.fields.passwordConfirm);
});

test("qeydiyyat: e-poçtun boşluqları və böyük hərfləri normallaşdırılır", async () => {
  const r = await reg({ email: "  Boyuk.Herf@Demo.Local  " });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await q("SELECT COUNT(*) AS n FROM users WHERE email = 'boyuk.herf@demo.local'"))[0].n, 1);
});
