// Tapşırığın 19-cu bəndindəki 7 məcburi ssenari.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, Client, IDS, login, q, closeDb, lastMonday } from "./helpers.mjs";

let t1, t2, t3, s1, s3, p1, editor, admin;
const S = IDS.subjects, C = IDS.classes, ST = IDS.students;

before(async () => {
  [t1, t2, t3, s1, s3, p1, editor, admin] = await Promise.all(
    ["muellim1", "muellim2", "muellim3", "sagird1", "sagird3", "valideyn1", "redaktor", "admin"].map((n) => login(`${n}@demo.local`))
  );
  // Fizika müəllimi 9-B-də qiymət yazır (sonrakı testlər üçün)
  const r = await t3.post("/api/grades", { classId: C.c9b, subjectId: S.FIZ, date: lastMonday(), type: "formativ", entries: [{ studentId: ST.s3, value: 5 }] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const r2 = await t1.post("/api/grades", { classId: C.c5a, subjectId: S.RIY, date: lastMonday(), type: "formativ", entries: [{ studentId: ST.s1, value: 4 }, { studentId: ST.s2, value: 3 }] });
  assert.equal(r2.status, 201, JSON.stringify(r2.body));
});
after(closeDb);

test("1. Şagird başqa şagirdin qiymətlərini görə bilmir", async () => {
  const own = await s1.get("/api/grades");
  assert.equal(own.status, 200);
  assert.ok(own.body.data.length >= 1);
  assert.ok(own.body.data.every((g) => g.student_id === ST.s1), "yalnız öz qiymətləri olmalıdır");
  const other = await s1.get(`/api/grades?studentId=${ST.s3}`);
  assert.deepEqual(other.body.data, []);
  const cls = await s1.get(`/api/grades?classId=${C.c5a}`);
  assert.ok(cls.body.data.every((g) => g.student_id === ST.s1), "sinif filtri ilə başqalarının qiyməti sızmamalıdır");
  assert.equal((await s1.get(`/api/attendance?studentId=${ST.s3}`)).status, 404);
  assert.equal((await s1.get(`/api/journal?classId=${C.c5a}&subjectId=${S.RIY}&from=2020-01-01&to=2030-01-01`)).status, 403);
  assert.equal((await s1.get(`/api/classes/${C.c5a}/students`)).status, 403);
});

test("2. Valideyn başqa ailənin uşağının məlumatlarını görə bilmir", async () => {
  const own = await p1.get(`/api/grades?studentId=${ST.s1}`);
  assert.ok(own.body.data.length >= 1);
  assert.deepEqual((await p1.get(`/api/grades?studentId=${ST.s3}`)).body.data, []);
  assert.deepEqual((await p1.get(`/api/grades?studentId=${ST.s2}`)).body.data, [], "eyni sinifdə olsa belə bağlanmamış uşaq");
  assert.equal((await p1.get(`/api/attendance?studentId=${ST.s3}`)).status, 404);
  assert.equal((await p1.get(`/api/schedule?classId=${C.c9b}`)).status, 403);
  const page = await p1.raw(`/grades?student=${ST.s3}`);
  assert.equal(page.status, 404, "başqa uşağın qiymət səhifəsi açılmamalıdır");
  const html = await page.text();
  assert.ok(!html.includes("Fidan"), "başqa uşağın adı səhifədə görünməməlidir");
  const att = await p1.raw(`/attendance?student=${ST.s3}`);
  assert.equal(att.status, 404);
  assert.ok(!(await att.text()).includes("Fidan"));
});

test("3. Müəllim icazəsi olmayan sinifin qiymətlərini dəyişə bilmir", async () => {
  // t2 yalnız 5-A Azərbaycan dili müəllimidir
  const add = await t2.post("/api/grades", { classId: C.c9b, subjectId: S.FIZ, date: lastMonday(), type: "formativ", entries: [{ studentId: ST.s3, value: 2 }] });
  assert.equal(add.status, 403);
  const add2 = await t2.post("/api/grades", { classId: C.c5a, subjectId: S.RIY, date: lastMonday(), type: "formativ", entries: [{ studentId: ST.s1, value: 2 }] });
  assert.equal(add2.status, 403, "öz sinfi olsa da başqa fənn");
  const [g] = await q("SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND deleted_at IS NULL LIMIT 1", [ST.s3, S.FIZ]);
  assert.equal((await t2.patch(`/api/grades/${g.id}`, { value: 2 })).status, 403);
  assert.equal((await t2.del(`/api/grades/${g.id}`)).status, 403);
  const [after] = await q("SELECT grade_value FROM grades WHERE id = ?", [g.id]);
  assert.equal(after.grade_value, 5);
  // Başqa sinfin şagirdini öz sinfinə "yazmaq" cəhdi
  const cross = await t1.post("/api/grades", { classId: C.c5a, subjectId: S.RIY, date: lastMonday(), type: "formativ", entries: [{ studentId: ST.s3, value: 5 }] });
  assert.equal(cross.status, 400);
  // Davamiyyət: t2 9-B üçün qeyd edə bilməz
  const att = await t2.post("/api/attendance", { classId: C.c9b, date: lastMonday(), period: 3, entries: [{ studentId: ST.s3, status: "unexcused" }] });
  assert.equal(att.status, 403);
});

test("4. Redaktor administrator səlahiyyəti əldə edə bilmir", async () => {
  assert.equal((await editor.get("/api/admin/users")).status, 403);
  const [{ id }] = await q("SELECT id FROM users WHERE email = 'redaktor@demo.local'");
  assert.equal((await editor.patch(`/api/admin/users/${id}`, { roles: ["super_admin"] })).status, 403);
  assert.equal((await editor.post("/api/admin/invitations", { role: "super_admin", days: 1 })).status, 403);
  assert.equal((await editor.get("/api/admin/r/students")).status, 403);
  assert.equal((await editor.put("/api/admin/settings", { school_name: "x" })).status, 403);
  // school_admin super_admin rolunu verə bilməz (yalnız super_admin)
  assert.equal((await admin.patch(`/api/admin/users/${id}`, { roles: ["editor", "super_admin"] })).status, 403);
  const roles = await q("SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?", [id]);
  assert.deepEqual(roles.map((r) => r.code), ["editor"]);
});

test("5. Adi istifadəçi URL/API dəyişməklə admin panelinə daxil ola bilmir", async () => {
  for (const c of [s1, p1, t2]) {
    assert.equal((await c.get("/api/admin/users")).status, 403);
    assert.equal((await c.get("/api/admin/audit")).status, 403);
    assert.equal((await c.get("/api/admin/r/classes")).status, 403);
    assert.equal((await c.post("/api/admin/r/subjects", { name_az: "Haker", code: "HCK" })).status, 403);
    assert.equal((await c.get("/api/reports/summary")).status, 403);
    for (const path of ["/admin", "/admin/users", "/admin/audit", "/admin/r/students", "/reports"]) {
      const page = await c.raw(path);
      assert.equal(page.status, 404, `${path}: admin səhifəsinin mövcudluğu açıqlanmamalıdır`);
      const html = await page.text();
      assert.ok(!html.includes("Aktiv istifadəçi") && !html.includes("Audit jurnalı</h1>"), `${path}: admin məzmunu sızmamalıdır`);
    }
  }
  // Mövcud olmayan resurs açarı və SQL identifikator manipulyasiyası
  assert.equal((await admin.get("/api/admin/r/users")).status, 404);
  assert.equal((await admin.get("/api/admin/r/students?sort=id;DROP%20TABLE%20users")).status, 200);
  const bad = await admin.post("/api/admin/r/subjects", { name_az: "X", code: "X1", password_hash: "x" });
  assert.equal(bad.status, 422, "konfiqurasiyada olmayan sütun qəbul edilməməlidir");
});

test("6. İctimai səhifələrdə şəxsi məlumat sızmır", async () => {
  await q("UPDATE teachers SET phone_private = '+994501234567', address_private = 'Gizli küçə 7' WHERE id = ?", [IDS.teachers.t1]);
  const html = await (await fetch(`${BASE}/teachers/${IDS.teachers.t1}`)).text();
  assert.ok(html.includes("Məmmədova"));
  assert.ok(!html.includes("+994501234567"));
  assert.ok(!html.includes("Gizli küçə"));
  const list = await (await fetch(`${BASE}/teachers`)).text();
  assert.ok(!list.includes("+994501234567"));
  // Şagirdlər üçün ictimai profil yoxdur; admin API-si anonimə bağlıdır
  assert.equal((await new Client().get("/api/admin/r/students")).status, 401);
  assert.equal((await new Client().get(`/api/grades?studentId=${ST.s1}`)).status, 401);
  const me = await s1.get("/api/auth/me");
  assert.ok(!JSON.stringify(me.body).includes("password"));
});

test("7. Qiymət və davamiyyət dəyişiklikləri audit tarixçəsində saxlanılır", async () => {
  const [g] = await q("SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND deleted_at IS NULL LIMIT 1", [ST.s1, S.RIY]);
  assert.equal((await t1.patch(`/api/grades/${g.id}`, { value: 5, note: "Düzəliş" })).status, 200);
  assert.equal((await t1.del(`/api/grades/${g.id}`)).status, 200);
  const logs = await q("SELECT action, old_values, new_values, user_id FROM audit_logs WHERE entity_type = 'grade' AND entity_id = ? ORDER BY id", [g.id]);
  assert.deepEqual(logs.map((l) => l.action), ["grade.create", "grade.update", "grade.delete"]);
  const upd = logs[1];
  const oldV = typeof upd.old_values === "string" ? JSON.parse(upd.old_values) : upd.old_values;
  const newV = typeof upd.new_values === "string" ? JSON.parse(upd.new_values) : upd.new_values;
  assert.equal(Number(oldV.grade_value), 4);
  assert.equal(Number(newV.grade_value), 5);
  const [row] = await q("SELECT deleted_at FROM grades WHERE id = ?", [g.id]);
  assert.ok(row.deleted_at, "qiymət fiziki silinməməli, soft delete olmalıdır");
  // Davamiyyət (sinif rəhbəri gündəlik qeyd)
  const a = await t1.post("/api/attendance", { classId: C.c5a, date: lastMonday(), period: 0, entries: [{ studentId: ST.s1, status: "late" }, { studentId: ST.s2, status: "present" }] });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  const b = await t1.post("/api/attendance", { classId: C.c5a, date: lastMonday(), period: 0, entries: [{ studentId: ST.s1, status: "excused", note: "Həkim arayışı" }, { studentId: ST.s2, status: "present" }] });
  assert.equal(b.status, 200);
  const alogs = await q("SELECT action FROM audit_logs WHERE entity_type = 'attendance' ORDER BY id");
  assert.ok(alogs.some((l) => l.action === "attendance.create"));
  assert.ok(alogs.some((l) => l.action === "attendance.update"));
});
