// Path B: Rəsmi Elektron Jurnala keçid. Yalnız naviqasiya — rəsmi sistemlə məlumat mübadiləsi və ya "daxil olmuşdur" statusu yoxdur.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { login, q, closeDb } from "./helpers.mjs";

let admin, teacher, director, student, parent, editor;

before(async () => {
  [admin, teacher, director, student, parent, editor] = await Promise.all(
    ["admin", "muellim1", "direktor", "sagird1", "valideyn1", "redaktor"].map((n) => login(`${n}@demo.local`))
  );
});
after(closeDb);

async function html(client, path) {
  const res = await client.raw(path);
  return { status: res.status, text: await res.text() };
}

test("müəllim: dashboard və ayrıca səhifədə rəsmi keçidlər yeni tabda, noopener ilə", async () => {
  for (const path of ["/dashboard", "/official-journal"]) {
    const r = await html(teacher, path);
    assert.equal(r.status, 200, path);
    assert.match(r.text, /Rəsmi Elektron Jurnal/);
    const links = [...r.text.matchAll(/<a[^>]+href="(https:\/\/[^"]+)"[^>]*>/g)].map((m) => m[0]);
    const jurnal = links.find((a) => a.includes("https://jurnal.edu.az/login"));
    const digital = links.find((a) => a.includes("https://digital.edu.az/auth/digital/login/teacher"));
    assert.ok(jurnal, `${path}: jurnal.edu.az keçidi`);
    assert.ok(digital, `${path}: digital.edu.az müəllim keçidi`);
    for (const a of [jurnal, digital]) {
      assert.match(a, /target="_blank"/);
      assert.match(a, /rel="noopener noreferrer"/);
    }
    assert.doesNotMatch(r.text, /Daxil olunub|Bağlıdır ✓|Sessiya aktivdir/, "uydurma autentifikasiya statusu olmamalıdır");
  }
});

test("direktor (müəllim profili olmadan): direktor girişi göstərilir", async () => {
  const r = await html(director, "/official-journal");
  assert.equal(r.status, 200);
  assert.match(r.text, /https:\/\/digital\.edu\.az\/auth\/digital\/login\/director/);
});

test("şagird, valideyn və redaktor: səhifə 404, qeyd sorğusu 403, menyuda görünmür", async () => {
  for (const c of [student, parent, editor]) {
    assert.equal((await html(c, "/official-journal")).status, 404);
    assert.equal((await c.post("/api/official-journal/open", { target: "jurnal" })).status, 403);
    const dash = await html(c, "/dashboard");
    assert.doesNotMatch(dash.text, /official-journal|jurnal\.edu\.az/);
  }
});

test("keçid qeydi: audit jurnalına yazılır və 'son keçid' kimi göstərilir; CSRF olmadan rədd edilir", async () => {
  const [u] = await q("SELECT id FROM users WHERE email = 'muellim1@demo.local'");
  assert.equal((await teacher.post("/api/official-journal/open", { target: "jurnal" }, { csrf: false })).status, 403);
  assert.equal((await teacher.post("/api/official-journal/open", { target: "https://evil.example" })).status, 422);
  const r = await teacher.post("/api/official-journal/open", { target: "digital" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const rows = await q("SELECT entity_type, new_values FROM audit_logs WHERE user_id = ? AND action = 'official_journal.open' ORDER BY id DESC LIMIT 1", [u.id]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].entity_type, "official_journal");
  const nv = typeof rows[0].new_values === "string" ? JSON.parse(rows[0].new_values) : rows[0].new_values;
  assert.deepEqual(nv, { target: "digital", host: "digital.edu.az" });
  const page = await html(teacher, "/official-journal");
  assert.doesNotMatch(page.text, /Hələ keçid edilməyib/);
  assert.match(page.text, /· Rəqəmsal məktəb/);
});

test("parametrlər: yalnız https + *.edu.az / *.gov.az qəbul edilir", async () => {
  for (const bad of ["http://jurnal.edu.az/login", "https://jurnal-edu.az.evil.com/login", "https://user:pw@jurnal.edu.az/", "https://example.com/"]) {
    const r = await admin.put("/api/admin/settings", { official_journal_url: bad });
    assert.equal(r.status, 422, bad);
  }
  assert.equal((await admin.put("/api/admin/settings", { official_support_email: "yanlış" })).status, 422);
  assert.equal((await admin.put("/api/admin/settings", { official_journal_url: "https://jurnal.edu.az/login" })).status, 200);
});

test("məktəbdaxili jurnal rəsmi jurnal olmadığını açıq bildirir", async () => {
  const r = await html(teacher, "/journal");
  assert.equal(r.status, 200);
  assert.match(r.text, /Bu, rəsmi dövlət jurnalı deyil/);
});

test("inteqrasiya statusu: yalnız Mərhələ 1 aktivdir, rəsmi identifikasiya/API/sinxronizasiya uydurulmur", async () => {
  const r = await teacher.get("/api/integrations/journal/status");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const d = r.body.data;
  assert.equal(d.localSession.authenticated, true);
  assert.equal(d.identityProvider.verified, false);
  assert.equal(d.officialApi.authorized, false);
  assert.equal(d.sync.supported, false);
  assert.deepEqual(d.capabilities.filter((c) => c.enabled).map((c) => c.key), ["portal_redirect"]);
  assert.equal((await student.get("/api/integrations/journal/status")).status, 403);
  assert.equal((await parent.get("/api/integrations/journal/status")).status, 403);
});
