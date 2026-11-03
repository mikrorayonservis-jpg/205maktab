import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, Client, IDS, PNG_1PX, login, q, closeDb, lastMonday, today } from "./helpers.mjs";

const S = IDS.subjects, C = IDS.classes, ST = IDS.students;
let admin, t1, s1, s3, p1, p2, author, editor, chief, director;

before(async () => {
  [admin, t1, s1, s3, p1, p2, author, editor, chief, director] = await Promise.all(
    ["admin", "muellim1", "sagird1", "sagird3", "valideyn1", "valideyn2", "muellif", "redaktor", "bas.redaktor", "direktor"].map((n) => login(`${n}@demo.local`))
  );
});
after(closeDb);

test("dəvət kodu ilə valideyn qeydiyyatı: yalnız bağlı uşaq görünür, kod təkrar istifadə edilmir", async () => {
  const inv = await admin.post("/api/admin/invitations", { role: "parent", studentId: ST.s2, relationType: "ana", days: 7 });
  assert.equal(inv.status, 201, JSON.stringify(inv.body));
  const code = inv.body.data.code;
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const [stored] = await q("SELECT code_hash FROM invitations WHERE id = ?", [inv.body.data.id]);
  assert.notEqual(stored.code_hash, code, "kod açıq saxlanmamalıdır");
  const anon = new Client();
  const body = { code: code.toLowerCase(), email: "yeni.valideyn@demo.local", firstName: "Gülnar", lastName: "İsmayılova", password: "Guclu-Parol-2026", passwordConfirm: "Guclu-Parol-2026" };
  assert.equal((await anon.post("/api/auth/register", body)).status, 201);
  const again = await new Client().post("/api/auth/register", { ...body, email: "basqa@demo.local" });
  assert.equal(again.status, 400, "istifadə olunmuş kod");
  const [u] = await q("SELECT id, email_verified FROM users WHERE email = 'yeni.valideyn@demo.local'");
  assert.equal(u.email_verified, 0);
  const roles = await q("SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?", [u.id]);
  assert.deepEqual(roles.map((r) => r.code), ["parent"], "qeydiyyat yalnız dəvətdəki rolu verir");
  await q("UPDATE users SET email_verified = 1 WHERE id = ?", [u.id]);
  const parent = await login("yeni.valideyn@demo.local", "Guclu-Parol-2026");
  const g = await parent.get("/api/grades");
  assert.ok(g.body.data.every((x) => x.student_id === ST.s2));
  assert.deepEqual((await parent.get(`/api/grades?studentId=${ST.s1}`)).body.data, []);
});

test("şagird dəvəti artıq hesabı olan şagird üçün yaradıla bilmir", async () => {
  const r = await admin.post("/api/admin/invitations", { role: "student", studentId: ST.s1, days: 7 });
  assert.equal(r.status, 409);
});

test("redaksiya iş axını: məqalə avtomatik dərc edilmir, rollar ardıcıllığı qorunur", async () => {
  const [cat] = await q("SELECT id FROM news_categories LIMIT 1").catch(() => [undefined]);
  const create = await author.post("/api/editorial", { title: "Test məqaləsi: məktəbdə elm həftəsi", summary: "Qısa", content: "Bu, avtomatik test üçün yazılmış məqalədir. <script>alert('x')</script>", categoryId: cat?.id ?? null, containsMinors: true, consentConfirmed: true, isFeatured: true });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  const id = create.body.data.id;
  const [row] = await q("SELECT status, consent_confirmed, is_featured FROM news WHERE id = ?", [id]);
  assert.equal(row.status, "draft");
  assert.equal(row.consent_confirmed, 0, "müəllif razılığı özü təsdiqləyə bilməz");
  assert.equal(row.is_featured, 0);
  const pub = await new Client().get("/api/news");
  assert.ok(!pub.body.data.rows.some((n) => n.id === id), "qaralama ictimai görünməməlidir");
  assert.equal((await author.post(`/api/editorial/${id}/transition`, { action: "publish" })).status, 403);
  assert.equal((await author.post(`/api/editorial/${id}/transition`, { action: "submit" })).status, 200);
  assert.equal((await author.put(`/api/editorial/${id}`, { title: "Dəyişdirilmiş", content: "Yoxlamada olan məqaləni müəllif dəyişə bilməz." })).status, 403);
  assert.equal((await editor.post(`/api/editorial/${id}/transition`, { action: "request_changes" })).status, 400, "səbəb tələb olunur");
  assert.equal((await editor.post(`/api/editorial/${id}/transition`, { action: "approve" })).status, 200);
  assert.equal((await editor.post(`/api/editorial/${id}/transition`, { action: "publish" })).status, 403, "redaktor dərc edə bilməz");
  const blocked = await chief.post(`/api/editorial/${id}/transition`, { action: "publish" });
  assert.equal(blocked.status, 400, "razılıq olmadan dərc edilməməlidir");
  const full = (await chief.get(`/api/editorial/${id}`)).body.data.article;
  const upd = await chief.put(`/api/editorial/${id}`, { title: full.title_az, summary: full.summary_az, content: full.content_az, categoryId: full.category_id, containsMinors: true, consentConfirmed: true });
  assert.equal(upd.status, 200, JSON.stringify(upd.body));
  assert.equal((await chief.post(`/api/editorial/${id}/transition`, { action: "publish" })).status, 200);
  const list = await new Client().get("/api/news");
  const item = list.body.data.rows.find((n) => n.id === id);
  assert.ok(item, "dərc edilmiş məqalə ictimai siyahıda olmalıdır");
  const html = await (await fetch(`${BASE}/news/${item.slug}`)).text();
  assert.ok(!html.includes("<script>alert('x')</script>"), "XSS: skript escape edilməlidir");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.match(html, /"@type":"NewsArticle"/);
  const hist = await q("SELECT action FROM news_revisions WHERE news_id = ? ORDER BY id", [id]);
  assert.deepEqual(hist.map((h) => h.action), ["create", "submit", "approve", "edit", "publish"]);
  const notified = await q("SELECT COUNT(*) AS n FROM notifications WHERE type = 'news' AND entity_id = ?", [id]);
  assert.ok(Number(notified[0].n) > 0);
});

test("cədvəl: eyni müəllimin eyni vaxtda iki sinifdə dərsi bloklanır", async () => {
  // t1 Bazar ertəsi 08:00-08:45 5-A-da riyaziyyat keçir
  const r = await admin.post("/api/schedule/lessons", { classId: C.c9b, subjectId: S.RIY, teacherId: IDS.teachers.t1, dayOfWeek: 1, period: 1, startTime: "08:10", endTime: "08:55" });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, "SCHEDULE_CONFLICT");
  assert.match(r.body.error.message, /Məmmədova/);
  const ok = await admin.post("/api/schedule/lessons", { classId: C.c9b, subjectId: S.TAR, teacherId: IDS.teachers.t2, dayOfWeek: 1, period: 1, startTime: "08:00", endTime: "08:45", room: "305" });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  const room = await admin.post("/api/schedule/lessons", { classId: C.c5a, subjectId: S.TAR, teacherId: IDS.teachers.t3, dayOfWeek: 1, period: 6, startTime: "08:20", endTime: "08:40", room: "305" });
  assert.equal(room.status, 409, "kabinet və sinif konflikti");
  assert.equal((await t1.post("/api/schedule/lessons", { classId: C.c9b, subjectId: S.RIY, teacherId: IDS.teachers.t1, dayOfWeek: 5, period: 6, startTime: "13:00", endTime: "13:45" })).status, 403);
  const own = await s1.get("/api/schedule");
  assert.equal(own.status, 200);
  assert.ok(own.body.data.every((l) => l.class_id === C.c5a));
});

test("ev tapşırığı: yalnız sinfin şagirdləri görür və cavab verir; fayllar qorunur", async () => {
  const fd = new FormData();
  fd.set("purpose", "homework");
  fd.set("file", new Blob([Buffer.from("%PDF-1.4\n%test\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n")], { type: "application/pdf" }), "tapsiriq.pdf");
  const up = await t1.post("/api/uploads", fd);
  assert.equal(up.status, 201, JSON.stringify(up.body));
  assert.match(up.body.data.url, /^\/api\/files\/\d+$/);
  const hw = await t1.post("/api/homework", { classId: C.c5a, subjectId: S.RIY, title: "Kəsrlər", description: "Səh. 45, 1-10", dueDate: today(), fileIds: [up.body.data.id] });
  assert.equal(hw.status, 201, JSON.stringify(hw.body));
  const id = hw.body.data.id;
  assert.equal((await s1.get(`/api/homework/${id}`)).status, 200);
  assert.equal((await s3.get(`/api/homework/${id}`)).status, 404, "başqa sinfin şagirdi");
  assert.equal((await p2.get(`/api/homework/${id}`)).status, 404, "başqa ailənin valideyni");
  assert.equal((await p1.get(`/api/homework/${id}`)).status, 200);
  assert.equal((await s1.raw(up.body.data.url)).status, 200, "sinfin şagirdi tapşırıq faylını aça bilər");
  assert.equal((await s3.raw(up.body.data.url)).status, 404, "başqa şagird faylı aça bilməz");
  assert.equal((await new Client().raw(up.body.data.url)).status, 401);
  assert.equal((await s3.post(`/api/homework/${id}/submissions`, { answer: "Cavab" })).status, 404);
  assert.equal((await s1.post(`/api/homework/${id}/submissions`, { answer: "1) 3/4 ..." })).status, 201);
  const subs = await t1.get(`/api/homework/${id}/submissions`);
  const mine = subs.body.data.find((x) => x.student_id === ST.s1);
  assert.ok(mine?.id);
  assert.equal((await s1.get(`/api/homework/${id}/submissions`)).status, 403, "şagird digər cavabları görə bilməz");
  assert.equal((await t1.patch(`/api/homework/submissions/${mine.id}`, { grade: 5, feedback: "Əla", status: "graded" })).status, 200);
  assert.equal((await s1.post(`/api/homework/${id}/submissions`, { answer: "dəyişiklik" })).status, 409);
  const n = await q("SELECT COUNT(*) AS n FROM notifications n JOIN users u ON u.id = n.user_id WHERE u.email IN ('sagird1@demo.local','valideyn1@demo.local') AND n.type = 'homework'");
  assert.ok(Number(n[0].n) >= 2);
});

test("fayl yükləmə: MIME saxtakarlığı və icazəsiz təyinat rədd edilir", async () => {
  const fake = new FormData();
  fake.set("purpose", "news");
  fake.set("file", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "shekil.png");
  assert.equal((await editor.post("/api/uploads", fake)).status, 400);
  const real = new FormData();
  real.set("purpose", "news");
  real.set("file", new Blob([PNG_1PX], { type: "image/png" }), "piksel.png");
  const ok = await editor.post("/api/uploads", real);
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.equal(ok.body.data.mimeType, "image/webp");
  const media = await fetch(`${BASE}${ok.body.data.url}`);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("content-type"), "image/webp");
  const forbidden = new FormData();
  forbidden.set("purpose", "document");
  forbidden.set("file", new Blob([PNG_1PX], { type: "image/png" }), "x.png");
  assert.equal((await s1.post("/api/uploads", forbidden)).status, 403);
  assert.equal((await fetch(`${BASE}/media/../.env`)).status, 404);
});

test("bildirişlər yalnız aidiyyəti istifadəçilərə gedir", async () => {
  const before = await s3.get("/api/notifications");
  const r = await t1.post("/api/grades", { classId: C.c5a, subjectId: S.RIY, date: lastMonday(), type: "ksq", entries: [{ studentId: ST.s1, value: 5 }] });
  assert.equal(r.status, 201);
  const s1n = await s1.get("/api/notifications?unread=1");
  assert.ok(s1n.body.data.items.some((n) => n.type === "grade"));
  const p1n = await p1.get("/api/notifications?unread=1");
  assert.ok(p1n.body.data.items.some((n) => n.type === "grade"));
  const s3n = await s3.get("/api/notifications");
  assert.equal(s3n.body.data.items.filter((n) => n.type === "grade").length, before.body.data.items.filter((n) => n.type === "grade").length);
  const ids = s1n.body.data.items.map((n) => n.id);
  assert.equal((await s3.post("/api/notifications/read", { ids })).status, 200);
  const still = await s1.get("/api/notifications?unread=1");
  assert.ok(still.body.data.unread >= ids.length, "başqasının bildirişini oxunmuş etmək mümkün olmamalıdır");
});

test("SQL injection cəhdləri təsirsizdir", async () => {
  const r = await new Client().get(`/api/news?q=${encodeURIComponent("' OR 1=1 -- ")}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.total, 0);
  const r2 = await director.get(`/api/admin/users?q=${encodeURIComponent("%' UNION SELECT password_hash FROM users -- ")}`);
  assert.equal(r2.status, 200);
  assert.ok(!JSON.stringify(r2.body).includes("$argon2"));
  const r3 = await admin.get(`/api/grades?studentId=${encodeURIComponent("1 OR 1=1")}`);
  assert.equal(r3.status, 422);
});

test("direktor statistikanı görür, müəllim görmür", async () => {
  const r = await director.get("/api/reports/summary");
  assert.equal(r.status, 200);
  assert.ok(r.body.data.counts.students >= 3);
  assert.equal((await t1.get("/api/reports/summary")).status, 403);
});

test("ictimai səhifələr açılır və SEO faylları mövcuddur", async () => {
  for (const p of ["/", "/about", "/administration", "/teachers", "/news", "/events", "/gallery", "/documents", "/contact", "/privacy", "/login", "/register"]) {
    const res = await fetch(`${BASE}${p}`);
    assert.equal(res.status, 200, p);
    const html = await res.text();
    assert.match(html, /<html lang="az"/, p);
  }
  const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
  assert.match(sm, /<urlset/);
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  assert.match(robots, /Disallow: \/admin/);
  assert.equal((await fetch(`${BASE}/news/movcud-olmayan-xeber`)).status, 404);
});
