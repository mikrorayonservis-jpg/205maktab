// Demo/test məlumatları yaradan ortaq modul. YALNIZ development və test bazaları üçündür.
// Bütün demo hesablar @demo.local domenindədir və production-da yaradılmır.
import { hash } from "@node-rs/argon2";

const ARGON = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function currentSchoolYear(now = new Date()) {
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return { name: `${y}-${y + 1}`, start: `${y}-09-01`, end: `${y + 1}-08-31` };
}

async function user(c, pwHash, email, first, last, roles) {
  const [r] = await c.query(
    `INSERT INTO users (email, first_name, last_name, password_hash, role, is_active, email_verified, email_verified_at, password_changed_at)
     VALUES (?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
    [email, first, last, pwHash, roles[0]]
  );
  for (const role of roles) await c.query("INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE code = ?", [r.insertId, role]);
  return r.insertId;
}

/**
 * Demo məktəb strukturu yaradır və istifadəçi/obyekt ID-lərini qaytarır.
 * @param {import("mysql2/promise").Connection} c
 * @param {string} password bütün demo hesablar üçün parol (mühitdən gəlir, kodda saxlanmır)
 */
export async function createDemoSchool(c, password, { classSuffix = "" } = {}) {
  const pw = await hash(password, ARGON);
  const sy = currentSchoolYear();
  // Mövcud tədris ili varsa, yenidən yaradılmır və digər illərin statusu dəyişdirilmir (real baza ilə uyğunluq)
  const [[existingYear]] = await c.query("SELECT id FROM school_years WHERE name = ?", [sy.name]);
  let yearId;
  if (existingYear) {
    yearId = existingYear.id;
    const [[active]] = await c.query("SELECT id FROM school_years WHERE is_active = 1 LIMIT 1");
    if (!active) await c.query("UPDATE school_years SET is_active = 1 WHERE id = ?", [yearId]);
  } else {
    const [[active]] = await c.query("SELECT id FROM school_years WHERE is_active = 1 LIMIT 1");
    const [yr] = await c.query("INSERT INTO school_years (name, start_date, end_date, is_active) VALUES (?, ?, ?, ?)", [sy.name, sy.start, sy.end, active ? 0 : 1]);
    yearId = yr.insertId;
  }

  const subj = {};
  for (const [code, name] of [["RIY", "Riyaziyyat"], ["AZD", "Azərbaycan dili"], ["ING", "İngilis dili"], ["FIZ", "Fizika"], ["TAR", "Azərbaycan tarixi"]]) {
    const [r] = await c.query("INSERT INTO subjects (code, name_az) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)", [code, name]);
    subj[code] = r.insertId;
  }

  const ids = { yearId, subjects: subj, users: {}, teachers: {}, students: {}, parents: {}, classes: {} };
  ids.users.admin = await user(c, pw, "admin@demo.local", "Admin", "Demo", ["school_admin"]);
  ids.users.director = await user(c, pw, "direktor@demo.local", "Direktor", "Demo", ["director"]);
  ids.users.editor = await user(c, pw, "redaktor@demo.local", "Redaktor", "Demo", ["editor"]);
  ids.users.chief = await user(c, pw, "bas.redaktor@demo.local", "Baş redaktor", "Demo", ["chief_editor"]);
  ids.users.author = await user(c, pw, "muellif@demo.local", "Müəllif", "Demo", ["author"]);

  const teacherDefs = [
    ["t1", "muellim1@demo.local", "Leyla", "Məmmədova", "Riyaziyyat", ["teacher", "class_teacher"]],
    ["t2", "muellim2@demo.local", "Rəşad", "Quliyev", "Azərbaycan dili", ["teacher"]],
    ["t3", "muellim3@demo.local", "Nigar", "Əliyeva", "Fizika", ["teacher", "class_teacher"]],
  ];
  for (const [k, email, first, last, subject, roles] of teacherDefs) {
    const uid = await user(c, pw, email, first, last, roles);
    ids.users[k] = uid;
    const [t] = await c.query(
      "INSERT INTO teachers (user_id, employee_code, first_name, last_name, subject, position_az, experience_years, is_public) VALUES (?, ?, ?, ?, ?, 'Müəllim', 10, 1)",
      [uid, `DEMO-${k.toUpperCase()}`, first, last, subject]
    );
    ids.teachers[k] = t.insertId;
  }

  for (const [k, name, grade, ct] of [["c5a", "5-A", 5, "t1"], ["c9b", "9-B", 9, "t3"]]) {
    const [r] = await c.query("INSERT INTO classes (name, grade_level, school_year_id, room, class_teacher_id, shift) VALUES (?, ?, ?, ?, ?, 1)", [name + classSuffix, grade, yearId, `${grade}0${grade}`, ids.teachers[ct]]);
    ids.classes[k] = r.insertId;
  }

  // Təyinatlar: t1 → 5-A riyaziyyat, 9-B riyaziyyat; t2 → 5-A Az. dili; t3 → 9-B fizika
  const assign = [["c5a", "RIY", "t1"], ["c9b", "RIY", "t1"], ["c5a", "AZD", "t2"], ["c9b", "FIZ", "t3"]];
  for (const [cl, s, t] of assign) {
    await c.query("INSERT INTO class_subjects (class_id, subject_id, teacher_id, school_year_id) VALUES (?, ?, ?, ?)", [ids.classes[cl], subj[s], ids.teachers[t], yearId]);
  }

  const studentDefs = [
    ["s1", "sagird1@demo.local", "Aysel", "Hüseynova", "c5a"],
    ["s2", "sagird2@demo.local", "Kamran", "İsmayılov", "c5a"],
    ["s3", "sagird3@demo.local", "Fidan", "Rzayeva", "c9b"],
  ];
  for (const [k, email, first, last, cl] of studentDefs) {
    const uid = await user(c, pw, email, first, last, ["student"]);
    ids.users[k] = uid;
    const [s] = await c.query("INSERT INTO students (user_id, student_code, first_name, last_name, class_id, school_year_id) VALUES (?, ?, ?, ?, ?, ?)", [uid, `DEMO-${k.toUpperCase()}`, first, last, ids.classes[cl], yearId]);
    ids.students[k] = s.insertId;
    await c.query("INSERT INTO class_students (class_id, student_id, school_year_id) VALUES (?, ?, ?)", [ids.classes[cl], s.insertId, yearId]);
  }

  for (const [k, email, first, last, kids] of [["p1", "valideyn1@demo.local", "Elçin", "Hüseynov", ["s1"]], ["p2", "valideyn2@demo.local", "Səbinə", "Rzayeva", ["s3"]]]) {
    const uid = await user(c, pw, email, first, last, ["parent"]);
    ids.users[k] = uid;
    const [p] = await c.query("INSERT INTO parents (user_id, first_name, last_name, email) VALUES (?, ?, ?, ?)", [uid, first, last, email]);
    ids.parents[k] = p.insertId;
    for (const kid of kids) await c.query("INSERT INTO parent_student (parent_id, student_id, relation_type) VALUES (?, ?, 'valideyn')", [p.insertId, ids.students[kid]]);
  }

  // Cədvəl: 5-A Bazar ertəsi 1-ci dərs riyaziyyat (t1), 2-ci dərs Az. dili (t2); 9-B Bazar ertəsi 2-ci dərs riyaziyyat (t1)
  const lesson = (cl, s, t, day, period, st, en) =>
    c.query("INSERT INTO lessons (class_id, subject_id, teacher_id, school_year_id, day_of_week, period, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)", [ids.classes[cl], subj[s], ids.teachers[t], yearId, day, period, st, en]);
  for (let day = 1; day <= 5; day++) {
    await lesson("c5a", "RIY", "t1", day, 1, "08:00", "08:45");
    await lesson("c5a", "AZD", "t2", day, 2, "08:50", "09:35");
    await lesson("c9b", "RIY", "t1", day, 2, "08:50", "09:35");
    await lesson("c9b", "FIZ", "t3", day, 3, "09:45", "10:30");
  }
  return ids;
}
