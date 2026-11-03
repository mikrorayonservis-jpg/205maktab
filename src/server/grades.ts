/** Qiymətlər: yazma, düzəliş, silmə (soft), siyahı və statistikalar. Hər dəyişiklik audit jurnalına düşür. */
import "server-only";
import type { NextRequest } from "next/server";
import { db, transaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { Errors } from "@/lib/http";
import type { CurrentUser } from "@/lib/auth/session";
import { z, id, isoDate, optionalText } from "@/lib/validation";
import { assertCanTeach, gradeScopeSql, requireActiveYear, studentAudienceUserIds } from "./access";
import { notifyUsers } from "./notifications";

export const GRADE_TYPES = {
  formativ: "Formativ (gündəlik)",
  ksq: "KSQ (kiçik summativ)",
  bsq: "BSQ (böyük summativ)",
  ev: "Ev tapşırığı",
  layihe: "Layihə",
  yekun: "Yekun",
} as const;
export type GradeType = keyof typeof GRADE_TYPES;
const gradeTypeEnum = z.enum(Object.keys(GRADE_TYPES) as [GradeType, ...GradeType[]]);
const gradeValue = z.coerce.number().int().min(2, "Qiymət 2-5 arasında olmalıdır.").max(5, "Qiymət 2-5 arasında olmalıdır.");

export const createGradesSchema = z.object({
  classId: id,
  subjectId: id,
  date: isoDate,
  type: gradeTypeEnum.default("formativ"),
  entries: z
    .array(z.object({ studentId: id, value: gradeValue, note: optionalText(255) }))
    .min(1)
    .max(60),
});

export const updateGradeSchema = z.object({
  value: gradeValue.optional(),
  type: gradeTypeEnum.optional(),
  date: isoDate.optional(),
  note: optionalText(255),
});

async function resolveTeacherId(user: CurrentUser, classId: number, subjectId: number, yearId: number): Promise<number> {
  const assigned = await db.queryOne<{ teacher_id: number | null }>(
    "SELECT teacher_id FROM class_subjects WHERE class_id = ? AND subject_id = ? AND school_year_id = ?",
    [classId, subjectId, yearId]
  );
  if (user.teacherId && assigned?.teacher_id === user.teacherId) return user.teacherId;
  if (assigned?.teacher_id) return assigned.teacher_id;
  if (user.teacherId) return user.teacherId;
  throw Errors.badRequest("Bu sinif və fənn üçün müəllim təyin edilməyib.");
}

export async function createGrades(user: CurrentUser, input: z.infer<typeof createGradesSchema>, req?: NextRequest) {
  await assertCanTeach(user, input.classId, input.subjectId, "grades.manage_all");
  const year = await requireActiveYear();
  if (input.date < year.start_date || input.date > year.end_date) throw Errors.badRequest("Tarix aktiv tədris ilinin hüdudlarından kənardadır.");
  const studentIds = [...new Set(input.entries.map((e) => e.studentId))];
  if (studentIds.length !== input.entries.length) throw Errors.badRequest("Eyni şagird üçün təkrar qiymət göndərilib.");
  const inClass = await db.query<{ id: number }>("SELECT id FROM students WHERE id IN (?) AND class_id = ? AND deleted_at IS NULL", [studentIds, input.classId]);
  if (inClass.length !== studentIds.length) throw Errors.badRequest("Seçilmiş şagirdlərin bəziləri bu sinifdə deyil.");
  const teacherId = await resolveTeacherId(user, input.classId, input.subjectId, year.id);
  const subject = await db.queryOne<{ name_az: string }>("SELECT name_az FROM subjects WHERE id = ?", [input.subjectId]);

  const created = await transaction(async (tx) => {
    const ids: number[] = [];
    for (const e of input.entries) {
      const res = await tx.execute(
        `INSERT INTO grades (student_id, subject_id, teacher_id, class_id, school_year_id, grade_type, grade_value, date, note, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.studentId, input.subjectId, teacherId, input.classId, year.id, input.type, e.value, input.date, e.note ?? null, user.id, user.id]
      );
      ids.push(res.insertId);
      await audit({ userId: user.id, action: "grade.create", entityType: "grade", entityId: res.insertId, newValues: { studentId: e.studentId, subjectId: input.subjectId, value: e.value, type: input.type, date: input.date, note: e.note }, req }, tx);
    }
    return ids;
  });

  const audience = await studentAudienceUserIds(studentIds);
  for (const e of input.entries) {
    await notifyUsers(audience.get(e.studentId) || [], {
      title: "Yeni qiymət daxil edildi",
      message: `${subject?.name_az ?? "Fənn"}: ${e.value} (${GRADE_TYPES[input.type]})`,
      type: "grade",
      link: "/grades",
      entityType: "grade",
    });
  }
  return { created: created.length };
}

async function loadGrade(gradeId: number) {
  const g = await db.queryOne(
    "SELECT id, student_id, subject_id, class_id, teacher_id, grade_type, grade_value, date, note FROM grades WHERE id = ? AND deleted_at IS NULL",
    [gradeId]
  );
  if (!g) throw Errors.notFound("Qiymət");
  return g;
}

export async function updateGrade(user: CurrentUser, gradeId: number, input: z.infer<typeof updateGradeSchema>, req?: NextRequest) {
  const old = await loadGrade(gradeId);
  await assertCanTeach(user, old.class_id, old.subject_id, "grades.manage_all");
  const next = {
    grade_value: input.value ?? old.grade_value,
    grade_type: input.type ?? old.grade_type,
    date: input.date ?? old.date,
    note: input.note === undefined ? old.note : input.note,
  };
  await transaction(async (tx) => {
    await tx.execute("UPDATE grades SET grade_value = ?, grade_type = ?, date = ?, note = ?, updated_by = ? WHERE id = ?", [
      next.grade_value, next.grade_type, next.date, next.note, user.id, gradeId,
    ]);
    await audit({ userId: user.id, action: "grade.update", entityType: "grade", entityId: gradeId, oldValues: old, newValues: next, req }, tx);
  });
  if (Number(next.grade_value) !== Number(old.grade_value)) {
    const audience = await studentAudienceUserIds([old.student_id]);
    await notifyUsers(audience.get(old.student_id) || [], {
      title: "Qiymət düzəldildi",
      message: `${old.grade_value} → ${next.grade_value}`,
      type: "grade",
      link: "/grades",
      entityType: "grade",
      entityId: gradeId,
    });
  }
  return { id: gradeId };
}

export async function deleteGrade(user: CurrentUser, gradeId: number, req?: NextRequest) {
  const old = await loadGrade(gradeId);
  await assertCanTeach(user, old.class_id, old.subject_id, "grades.manage_all");
  await transaction(async (tx) => {
    await tx.execute("UPDATE grades SET deleted_at = NOW(), updated_by = ? WHERE id = ?", [user.id, gradeId]);
    await audit({ userId: user.id, action: "grade.delete", entityType: "grade", entityId: gradeId, oldValues: old, req }, tx);
  });
}

export const listGradesQuery = z.object({
  studentId: id.optional(),
  classId: id.optional(),
  subjectId: id.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(500),
});

export interface GradeRow {
  id: number;
  student_id: number;
  student_name: string;
  subject_id: number;
  subject_name: string;
  class_id: number;
  grade_type: GradeType;
  grade_value: number;
  date: string;
  note: string | null;
  teacher_name: string;
}

export async function listGrades(user: CurrentUser, q: z.infer<typeof listGradesQuery>): Promise<GradeRow[]> {
  const scope = gradeScopeSql(user);
  const where = ["g.deleted_at IS NULL", scope.sql];
  const params: unknown[] = [...scope.params];
  if (q.studentId) { where.push("g.student_id = ?"); params.push(q.studentId); }
  if (q.classId) { where.push("g.class_id = ?"); params.push(q.classId); }
  if (q.subjectId) { where.push("g.subject_id = ?"); params.push(q.subjectId); }
  if (q.from) { where.push("g.date >= ?"); params.push(q.from); }
  if (q.to) { where.push("g.date <= ?"); params.push(q.to); }
  params.push(q.limit);
  return db.query<GradeRow>(
    `SELECT g.id, g.student_id, CONCAT(st.last_name, ' ', st.first_name) AS student_name, g.subject_id, s.name_az AS subject_name,
            g.class_id, g.grade_type, g.grade_value, g.date, g.note, CONCAT(t.first_name, ' ', t.last_name) AS teacher_name
       FROM grades g
       JOIN students st ON st.id = g.student_id
       JOIN subjects s ON s.id = g.subject_id
       JOIN teachers t ON t.id = g.teacher_id
      WHERE ${where.join(" AND ")}
      ORDER BY g.date DESC, g.id DESC
      LIMIT ?`,
    params
  );
}

/** Şagirdin fənlər üzrə ortalamaları və aylıq inkişaf (əvvəlcədən icazə yoxlanılmalıdır). */
export async function studentGradeSummary(studentId: number) {
  const year = await requireActiveYear();
  const bySubject = await db.query<{ subject_id: number; subject_name: string; avg: number; count: number; last_date: string }>(
    `SELECT g.subject_id, s.name_az AS subject_name, ROUND(AVG(g.grade_value), 2) AS avg, COUNT(*) AS count, MAX(g.date) AS last_date
       FROM grades g JOIN subjects s ON s.id = g.subject_id
      WHERE g.student_id = ? AND g.deleted_at IS NULL AND g.school_year_id = ?
      GROUP BY g.subject_id, s.name_az ORDER BY s.name_az`,
    [studentId, year.id]
  );
  const byMonth = await db.query<{ ym: string; avg: number; count: number }>(
    `SELECT DATE_FORMAT(g.date, '%Y-%m') AS ym, ROUND(AVG(g.grade_value), 2) AS avg, COUNT(*) AS count
       FROM grades g WHERE g.student_id = ? AND g.deleted_at IS NULL AND g.school_year_id = ?
      GROUP BY ym ORDER BY ym`,
    [studentId, year.id]
  );
  const overall = await db.queryOne<{ avg: number | null; count: number }>(
    "SELECT ROUND(AVG(grade_value), 2) AS avg, COUNT(*) AS count FROM grades WHERE student_id = ? AND deleted_at IS NULL AND school_year_id = ?",
    [studentId, year.id]
  );
  return {
    bySubject: bySubject.map((r) => ({ ...r, avg: Number(r.avg), count: Number(r.count) })),
    byMonth: byMonth.map((r) => ({ ...r, avg: Number(r.avg), count: Number(r.count) })),
    overall: { avg: overall?.avg === null || overall?.avg === undefined ? null : Number(overall.avg), count: Number(overall?.count || 0) },
  };
}

/** Jurnal görünüşü: sinif+fənn üzrə şagirdlər və qiymətlər (icazə əvvəlcədən yoxlanılır). */
export async function journalSheet(classId: number, subjectId: number, from: string, to: string) {
  const students = await db.query<{ id: number; first_name: string; last_name: string; student_code: string }>(
    "SELECT id, first_name, last_name, student_code FROM students WHERE class_id = ? AND deleted_at IS NULL ORDER BY last_name, first_name",
    [classId]
  );
  const grades = await db.query<{ id: number; student_id: number; date: string; grade_value: number; grade_type: GradeType; note: string | null }>(
    `SELECT id, student_id, date, grade_value, grade_type, note FROM grades
      WHERE class_id = ? AND subject_id = ? AND deleted_at IS NULL AND date BETWEEN ? AND ? ORDER BY date, id`,
    [classId, subjectId, from, to]
  );
  return { students, grades };
}
