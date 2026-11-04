// Sinif dəvət kodları, kodla qeydiyyat, toplu köçürmə və CSV import.
// run.mjs serveri REGISTRATION_AUTO_VERIFY=1 ilə işə salır (SMTP yoxdur).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Client, login, q, closeDb, IDS } from "./helpers.mjs";

after(closeDb);
const PW = "Sinif-Kod-2026x";
const reg = (email, code, firstName = "Test", lastName = "Şagird") =>
  new Client().post("/api/auth/register", { code, email, firstName, lastName, password: PW, passwordConfirm: PW });

const state = {};

test("giriş: ard-arda uğurlu girişlər 'uğursuz cəhd' limitinə düşmür", async () => {
  for (let i = 0; i < 10; i++) await login("direktor@demo.local");
});

test("1–4. admin və direktor sinif yaradır, kod avtomatik və unikaldır; müəllim yarada bilmir", async () => {
  const admin = await login("admin@demo.local");
  const a = await admin.post("/api/admin/classes", { name: "10-B", classTeacherId: IDS.teachers.t2 });
  assert.equal(a.status, 201, JSON.stringify(a.body));
  assert.match(a.body.data.code, /^205-10B-[A-Z2-9]{5}$/);
  state.c10 = a.body.data;

  const director = await login("direktor@demo.local");
  const d = await director.post("/api/admin/classes", { name: "11-B" });
  assert.equal(d.status, 201, JSON.stringify(d.body));
  assert.match(d.body.data.code, /^205-11B-/);
  assert.notEqual(d.body.data.code, a.body.data.code);
  state.c11 = d.body.data;
  assert.equal((await director.raw("/admin/classes")).status, 200, "direktor sinif səhifəsini açır");

  // eyni tədris ilində eyni adlı sinif yaradılmır
  assert.equal((await admin.post("/api/admin/classes", { name: "10-b" })).status, 409);

  // sinif rəhbəri təyin edildi və class_teacher rolu verildi
  const [cls] = await q("SELECT class_teacher_id, school_year_id FROM classes WHERE id = ?", [state.c10.id]);
  assert.equal(cls.class_teacher_id, IDS.teachers.t2);
  const [role] = await q("SELECT COUNT(*) AS n FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? AND r.code = 'class_teacher'", [IDS.users.t2]);
  assert.equal(Number(role.n), 1);

  const teacher = await login("muellim1@demo.local");
  assert.equal((await teacher.post("/api/admin/classes", { name: "9-C" })).status, 403);
  assert.equal((await teacher.get("/api/admin/classes")).status, 403);
  assert.equal((await teacher.raw("/admin/classes")).status, 404);
  const editor = await login("redaktor@demo.local");
  assert.equal((await editor.post("/api/admin/classes", { name: "9-C" })).status, 403);

  // kod audit jurnalında tam şəkildə saxlanılmır
  const logs = await q("SELECT new_values::text AS v FROM audit_logs WHERE action = 'class.create'");
  assert.ok(logs.length >= 2);
  for (const l of logs) assert.ok(!l.v.includes(state.c10.code) && !l.v.includes(state.c11.code), "tam kod auditdə olmamalıdır");
});

test("köhnə siniflər (koddan əvvəl yaradılmış) bir düymə ilə kod alır; müəllim bunu edə bilmir", async () => {
  const [cls] = await q("SELECT school_year_id FROM classes WHERE id = ?", [IDS.classes.c5a]);
  const teacher = await login("muellim1@demo.local");
  assert.equal((await teacher.post("/api/admin/classes/missing-codes", { yearId: cls.school_year_id })).status, 403);
  const admin = await login("admin@demo.local");
  const r = await admin.post("/api/admin/classes/missing-codes", { yearId: cls.school_year_id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok(r.body.data.created >= 1);
  const [k] = await q("SELECT code FROM class_invite_codes WHERE class_id = ? AND revoked_at IS NULL", [IDS.classes.c5a]);
  assert.match(k.code, /^205-05A-/);
  assert.equal((await admin.post("/api/admin/classes/missing-codes", { yearId: cls.school_year_id })).body.data.created, 0, "ikinci dəfə heç nə yaradılmır");
});

test("direktor müavini (icazə ilə) sinif yaradır və şagird köçürür", async () => {
  const admin = await login("admin@demo.local");
  const inv = await admin.post("/api/admin/invitations", { role: "deputy_director", days: 1 });
  assert.equal(inv.status, 201, JSON.stringify(inv.body));
  assert.equal((await reg("muavin@demo.local", inv.body.data.code, "Müavin", "Demo")).status, 201);
  await q("UPDATE users SET email_verified = 1 WHERE email = 'muavin@demo.local'");
  const deputy = await login("muavin@demo.local", PW);
  const r = await deputy.post("/api/admin/classes", { name: "9-C" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  state.c9 = r.body.data;
});

test("5–7. şagird 10B kodu ilə 10B-yə, 11B kodu ilə 11B-yə düşür; sinfini kabinetdə görür", async () => {
  const r1 = await reg("kod10b@demo.local", state.c10.code.toLowerCase(), "Əli", "Məmmədov");
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  assert.match(r1.body.data.message, /10-B sinfinə qoşuldunuz/);
  const [s1] = await q(
    `SELECT s.class_id, s.school_year_id, c.school_year_id AS class_year, u.role,
            (SELECT COUNT(*) FROM class_students cs WHERE cs.student_id = s.id AND cs.class_id = s.class_id) AS hist,
            (SELECT COUNT(*) FROM user_roles ur JOIN roles ro ON ro.id = ur.role_id WHERE ur.user_id = u.id AND ro.code = 'student') AS is_student
       FROM users u JOIN students s ON s.user_id = u.id JOIN classes c ON c.id = s.class_id WHERE u.email = 'kod10b@demo.local'`
  );
  assert.equal(s1.class_id, state.c10.id);
  assert.equal(s1.school_year_id, s1.class_year, "tədris ili sinifdən götürülür");
  assert.equal(s1.role, "student");
  assert.equal(Number(s1.hist), 1);
  assert.equal(Number(s1.is_student), 1);

  const r2 = await reg("kod11b@demo.local", ` ${state.c11.code} `, "Aysel", "Əliyeva");
  assert.equal(r2.status, 201, JSON.stringify(r2.body));
  const [s2] = await q("SELECT s.class_id FROM users u JOIN students s ON s.user_id = u.id WHERE u.email = 'kod11b@demo.local'");
  assert.equal(s2.class_id, state.c11.id);

  const c = await login("kod10b@demo.local", PW);
  const dash = await (await c.raw("/dashboard")).text();
  assert.match(dash, /10-B/);
  const [k] = await q("SELECT use_count FROM class_invite_codes WHERE class_id = ? AND revoked_at IS NULL", [state.c10.id]);
  assert.equal(k.use_count, 1);
});

test("8–10. yanlış, deaktiv, vaxtı keçmiş, limiti dolmuş, ləğv edilmiş və başqa məktəbin kodu qəbul edilmir", async () => {
  const admin = await login("admin@demo.local");
  const bad = async (code, email) => {
    const r = await reg(email, code);
    assert.equal(r.status, 400, `${code}: ${JSON.stringify(r.body)}`);
    assert.equal((await q("SELECT COUNT(*) AS n FROM users WHERE email = ?", [email]))[0].n, 0, "hesab yaranmamalıdır");
  };
  await bad("205-10B-ZZZZZ", "yanlis1@demo.local");
  await bad("999-10B-" + state.c10.code.slice(-5), "basqa1@demo.local"); // başqa məktəb prefiksi
  await bad(state.c10.code.replace("10B", "11B"), "qarisiq1@demo.local"); // başqa sinfin prefiksi ilə saxta kod

  assert.equal((await admin.patch(`/api/admin/classes/${state.c10.id}/code`, { isActive: false })).status, 200);
  await bad(state.c10.code, "deaktiv1@demo.local");
  assert.equal((await admin.patch(`/api/admin/classes/${state.c10.id}/code`, { isActive: true, expiresAt: "2020-01-01" })).status, 200);
  await bad(state.c10.code, "vaxt1@demo.local");
  assert.equal((await admin.patch(`/api/admin/classes/${state.c10.id}/code`, { expiresAt: "", maxUses: 1 })).status, 200);
  await bad(state.c10.code, "limit1@demo.local"); // artıq 1 istifadə var
  assert.equal((await admin.patch(`/api/admin/classes/${state.c10.id}/code`, { maxUses: "" })).status, 200);

  const rot = await admin.post(`/api/admin/classes/${state.c10.id}/code`, {});
  assert.equal(rot.status, 201);
  assert.notEqual(rot.body.data.code, state.c10.code);
  await bad(state.c10.code, "kohne1@demo.local");
  state.c10.code = rot.body.data.code;
  assert.equal((await reg("yeni10b@demo.local", state.c10.code)).status, 201);

  assert.equal((await admin.patch(`/api/admin/classes/${state.c9.id}`, { isActive: false })).status, 200);
  await bad(state.c9.code, "deaktivsinif@demo.local");
  // sinif deaktivdirsə ona köçürmək olmaz
  assert.equal((await admin.post("/api/admin/students/placement", { studentIds: [IDS.students.s1], classId: state.c9.id, preview: true })).status, 400);
});

test("toplu köçürmə: əvvəlcə preview, sonra tətbiq; audit yazılır; şagird və müəllim edə bilmir", async () => {
  const director = await login("direktor@demo.local");
  const ids = [IDS.students.s1, IDS.students.s2];
  const before = await q("SELECT id, class_id FROM students WHERE id IN (?)", [ids]);
  const p = await director.post("/api/admin/students/placement", { studentIds: ids, classId: state.c11.id, preview: true });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.equal(p.body.data.moves.length, 2);
  assert.deepEqual(await q("SELECT id, class_id FROM students WHERE id IN (?)", [ids]), before, "preview heç nə dəyişməməlidir");

  const a = await director.post("/api/admin/students/placement", { studentIds: ids, classId: state.c11.id, preview: false });
  assert.equal(a.status, 200);
  const after = await q("SELECT class_id FROM students WHERE id IN (?)", [ids]);
  assert.ok(after.every((s) => s.class_id === state.c11.id));
  assert.equal((await q("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'class.students_move'"))[0].n, 1);

  const list = await director.get(`/api/admin/students/placement?class=${state.c11.id}`);
  assert.equal(list.status, 200);
  assert.ok(list.body.data.rows.some((s) => s.id === IDS.students.s1));

  const student = await login("kod11b@demo.local", PW);
  assert.equal((await student.post("/api/admin/students/placement", { studentIds: ids, classId: state.c10.id, preview: false })).status, 403);
  const teacher = await login("muellim1@demo.local");
  assert.equal((await teacher.post("/api/admin/students/import", { csv: "student_id,class_code\nX,Y", apply: false })).status, 403);
});

test("11–12. CSV import: mövcud şagird təkrar yaranmır, yanlış kod və təkrar sətirlər aşkarlanır, xəta varsa heç nə yazılmır", async () => {
  const admin = await login("admin@demo.local");
  const [s3] = await q("SELECT student_code FROM students WHERE id = ?", [IDS.students.s3]);
  const csv = [
    "student_id,first_name,last_name,class_code",
    `${s3.student_code},,,${state.c10.code}`, // mövcud → köçür
    `IMP-1,Murad,Həsənov,${state.c11.code}`, // yeni
    `IMP-1,Murad,Həsənov,${state.c11.code}`, // faylda təkrar
    "IMP-2,Nərmin,Quliyeva,205-10B-ZZZZZ", // yanlış kod
    `,Kamran,Vəliyev,${state.c10.code}`,
  ].join("\n");
  const total = Number((await q("SELECT COUNT(*) AS n FROM students"))[0].n);
  const r = await admin.post("/api/admin/students/import", { csv, apply: true });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.applied, false, "xəta varsa yazılmamalıdır");
  assert.equal(r.body.data.summary.error, 2);
  assert.equal(Number((await q("SELECT COUNT(*) AS n FROM students"))[0].n), total);
  const msgs = r.body.data.rows.filter((x) => x.status === "error").map((x) => x.message).join(" | ");
  assert.match(msgs, /Təkrar/);
  assert.match(msgs, /Sinif kodu tapılmadı/);

  const good = [
    "student_id;first_name;last_name;class_code",
    `${s3.student_code};;;${state.c10.code}`,
    `IMP-1;Murad;Həsənov;${state.c11.code}`,
    `;Kamran;Vəliyev;${state.c10.code}`,
  ].join("\r\n");
  const prev = await admin.post("/api/admin/students/import", { csv: good, apply: false });
  assert.deepEqual(prev.body.data.summary, { create: 2, move: 1, unchanged: 0, error: 0 });
  const done = await admin.post("/api/admin/students/import", { csv: good, apply: true });
  assert.equal(done.body.data.applied, true);
  assert.equal(Number((await q("SELECT COUNT(*) AS n FROM students"))[0].n), total + 2);
  assert.equal((await q("SELECT class_id FROM students WHERE id = ?", [IDS.students.s3]))[0].class_id, state.c10.id);

  // təkrar import: heç nə dəyişmir; kodsuz eyni ad bazada var → ehtimal olunan təkrar kimi xəta
  const again = await admin.post("/api/admin/students/import", { csv: good, apply: false });
  assert.equal(again.body.data.summary.unchanged, 2);
  assert.match(again.body.data.rows.find((x) => x.name.includes("Kamran")).message, /Ehtimal olunan təkrar/);

  // import edilmiş hesabsız profil: şagird sinif kodu ilə qeydiyyatdan keçəndə ona bağlanır (təkrar yaranmır)
  const before = Number((await q("SELECT COUNT(*) AS n FROM students"))[0].n);
  assert.equal((await reg("murad@demo.local", state.c11.code, "Murad", "Həsənov")).status, 201);
  assert.equal(Number((await q("SELECT COUNT(*) AS n FROM students"))[0].n), before);
  const [m] = await q("SELECT s.student_code FROM students s JOIN users u ON u.id = s.user_id WHERE u.email = 'murad@demo.local'");
  assert.equal(m.student_code, "IMP-1");
});

test("13. 1000 şagirdlik import və siyahı performans problemi yaratmır", async () => {
  const admin = await login("admin@demo.local");
  const lines = ["student_id,first_name,last_name,class_code"];
  for (let i = 0; i < 1000; i++) lines.push(`BULK-${String(i).padStart(4, "0")},Ad${i},Soyad${i},${i % 2 ? state.c10.code : state.c11.code}`);
  const t0 = Date.now();
  const r = await admin.post("/api/admin/students/import", { csv: lines.join("\n"), apply: true });
  const ms = Date.now() - t0;
  assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));
  assert.equal(r.body.data.applied, true);
  assert.equal(r.body.data.summary.create, 1000);
  assert.ok(ms < 20000, `import ${ms} ms çəkdi`);
  console.log(`  1000 sətir import: ${ms} ms`);

  const t1 = Date.now();
  const list = await admin.get(`/api/admin/students/placement?class=${state.c10.id}&page=5`);
  const t2 = Date.now();
  assert.equal(list.status, 200);
  assert.equal(list.body.data.rows.length, 50);
  assert.ok(list.body.data.total >= 500);
  const classes = await admin.get("/api/admin/classes");
  assert.equal(classes.status, 200);
  console.log(`  yerləşdirmə siyahısı (səhifə 5): ${t2 - t1} ms, sinif siyahısı: ${Date.now() - t2} ms`);
  assert.ok(t2 - t1 < 3000);
  const c10 = classes.body.data.find((c) => c.id === state.c10.id);
  assert.ok(c10.student_count >= 500 && c10.code === state.c10.code);
});
