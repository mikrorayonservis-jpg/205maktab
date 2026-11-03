// Bütün səhifə və GET API-ləri rollar üzrə açılır, heç biri 500 qaytarmır; admin CRUD-un hər resursu
// (siyahı, axtarış, sıralama, ixrac, yaratma, redaktə, silmə) Postgres üzərində işləyir.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client, IDS, login, closeDb, today } from "./helpers.mjs";

let admin, director, t1, s1, p1, chief;
before(async () => {
  [admin, director, t1, s1, p1, chief] = await Promise.all(
    ["admin", "direktor", "muellim1", "sagird1", "valideyn1", "bas.redaktor"].map((n) => login(`${n}@demo.local`))
  );
});
after(closeDb);

const RESOURCES = ["school-years", "subjects", "classes", "assignments", "teachers", "students", "news-categories", "events", "galleries", "documents", "leadership", "achievements", "links", "bell-times"];

async function noServerError(client, paths) {
  for (const p of paths) {
    const r = await client.raw(p);
    assert.ok(r.status < 500, `${p} → ${r.status}`);
  }
}

test("ictimai səhifələr (sessiyasız) 500 qaytarmır", async () => {
  await noServerError(new Client(), [
    "/", "/about", "/administration", "/teachers", `/teachers/${IDS.teachers.t1}`, "/news", "/news?q=test", "/events", "/gallery", "/gallery?year=2026",
    "/documents", "/contact", "/privacy", "/terms", "/login", "/register", "/forgot-password", "/sitemap.xml", "/robots.txt", "/api/news", "/api/news?q=a",
  ]);
});

test("rol üzrə kabinet səhifələri və API-lər 500 qaytarmır", async () => {
  const common = ["/dashboard", "/profile", "/notifications", "/grades", "/attendance", "/schedule", "/homework", "/official-journal", "/api/auth/me", "/api/auth/sessions", "/api/notifications", "/api/homework", "/api/schedule", "/api/grades"];
  for (const c of [s1, p1, t1, director, chief, admin]) await noServerError(c, common);
  await noServerError(t1, ["/journal", "/homework/new", "/api/teacher/assignments", `/api/classes/${IDS.classes.c5a}/students`, `/api/attendance?classId=${IDS.classes.c5a}&date=${today()}&period=0`]);
  await noServerError(director, ["/reports", "/api/reports/summary", `/api/attendance/report?classId=${IDS.classes.c5a}&from=2026-09-01&to=${today()}`, "/api/schedule/conflicts", `/schedule?teacher=${IDS.teachers.t1}`]);
  await noServerError(chief, ["/editorial", "/editorial/new", "/api/editorial", "/api/editorial?scope=queue&search=a"]);
});

test("admin panelinin bütün səhifələri və API-ləri 500 qaytarmır", async () => {
  await noServerError(admin, [
    "/admin", "/admin/users", "/admin/users?search=demo", `/admin/users/${IDS.users.t1}`, "/admin/invitations", "/admin/parents", "/admin/schedule", "/admin/settings",
    "/admin/pages", "/admin/audit", "/admin/broadcast",
    "/api/admin/users?search=demo&role=teacher", `/api/admin/users/${IDS.users.t1}`, "/api/admin/invitations", "/api/admin/settings", "/api/admin/pages/about",
    `/api/admin/parent-links?studentId=${IDS.students.s1}`, "/api/admin/audit?action=grade&from=2026-01-01&to=2030-12-31", "/api/admin/audit?format=csv",
    ...["subjects", "classes", "teachers", "school_years", "news_categories", "galleries"].map((s) => `/api/admin/options?source=${s}`),
    ...RESOURCES.flatMap((r) => [`/admin/r/${r}`, `/api/admin/r/${r}`, `/api/admin/r/${r}?q=a&sort=id&dir=desc`, `/api/admin/r/${r}/export`]),
  ]);
});

test("admin CRUD: yaratma, redaktə, silmə Postgres-də işləyir", async () => {
  const create = async (r, body) => {
    const res = await admin.post(`/api/admin/r/${r}`, body);
    assert.equal(res.status, 201, `${r}: ${JSON.stringify(res.body)}`);
    return res.body.data.id;
  };
  const ev = await create("events", { title_az: "Smoke tədbir", start_datetime: `${today()}T10:00`, status: "planned", is_published: true });
  assert.equal((await admin.patch(`/api/admin/r/events/${ev}`, { location_az: "Akt zalı" })).status, 200);
  const gal = await create("galleries", { title_az: "Smoke albom" });
  const sub = await create("subjects", { name_az: "Smoke fənn", code: "SMK" });
  const ach = await create("achievements", { title_az: "Smoke nailiyyət" });
  const link = await create("links", { title_az: "Nazirlik", url: "https://edu.gov.az" });
  const lead = await create("leadership", { full_name: "Smoke Rəhbər", position_az: "Müavin" });
  const bell = await create("bell-times", { shift: "2", period: 8, start_time: "19:00", end_time: "19:45" });
  // Rəqəm sütununa yanlış dəyər → 400/422 (500 deyil)
  const bad = await admin.get("/api/admin/r/students?class_id=abc");
  assert.ok(bad.status < 500, `bad filter → ${bad.status}`);
  for (const [r, id] of [["events", ev], ["galleries", gal], ["subjects", sub], ["achievements", ach], ["links", link], ["leadership", lead], ["bell-times", bell]]) {
    const d = await admin.del(`/api/admin/r/${r}/${id}`);
    assert.equal(d.status, 200, `${r} delete: ${JSON.stringify(d.body)}`);
  }
});

test("sayt parametrləri və statik səhifə saxlanılır (ON CONFLICT upsert)", async () => {
  assert.equal((await admin.put("/api/admin/settings", { working_hours: "5 günlük iş həftəsi" })).status, 200);
  assert.equal((await admin.put("/api/admin/settings", { working_hours: "6 günlük iş həftəsi" })).status, 200);
  const s = await admin.get("/api/admin/settings");
  assert.equal(s.body.data.values.working_hours, "6 günlük iş həftəsi");
  for (let i = 0; i < 2; i++) {
    const r = await admin.put("/api/admin/pages/mission", { title: "Missiya", content: `Mətn ${i}` });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  assert.equal((await admin.get("/api/admin/pages/mission")).body.data.content_md, "Mətn 1");
});
