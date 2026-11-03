/** Dərs cədvəli: həftəlik görünüşlər, dərs CRUD və konflikt aşkarlanması (müəllim, sinif, kabinet). */
import "server-only";
import type { NextRequest } from "next/server";
import { db, transaction, type Db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError, Errors } from "@/lib/http";
import { z, id, optionalText, time } from "@/lib/validation";
import { requireActiveYear } from "./access";

export interface LessonRow {
  id: number;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  room: string | null;
}

const BASE = `SELECT l.id, l.class_id, c.name AS class_name, l.subject_id, s.name_az AS subject_name, l.teacher_id,
                     CONCAT(t.first_name, ' ', t.last_name) AS teacher_name, l.day_of_week, l.period,
                     to_char(l.start_time, 'HH24:MI') AS start_time, to_char(l.end_time, 'HH24:MI') AS end_time, l.room
                FROM lessons l
                JOIN classes c ON c.id = l.class_id
                JOIN subjects s ON s.id = l.subject_id
                JOIN teachers t ON t.id = l.teacher_id`;

export async function lessonsFor(filter: { classId?: number; teacherId?: number; subjectId?: number }): Promise<LessonRow[]> {
  const year = await requireActiveYear();
  const where = ["l.school_year_id = ?"];
  const params: unknown[] = [year.id];
  if (filter.classId) { where.push("l.class_id = ?"); params.push(filter.classId); }
  if (filter.teacherId) { where.push("l.teacher_id = ?"); params.push(filter.teacherId); }
  if (filter.subjectId) { where.push("l.subject_id = ?"); params.push(filter.subjectId); }
  return db.query<LessonRow>(`${BASE} WHERE ${where.join(" AND ")} ORDER BY l.day_of_week, l.start_time, c.name`, params);
}

export const lessonSchema = z
  .object({
    classId: id,
    subjectId: id,
    teacherId: id,
    dayOfWeek: z.coerce.number().int().min(1).max(6),
    period: z.coerce.number().int().min(1).max(8),
    startTime: time,
    endTime: time,
    room: optionalText(20),
  })
  .refine((v) => v.startTime < v.endTime, { message: "Dərsin bitmə vaxtı başlama vaxtından sonra olmalıdır.", path: ["endTime"] });
export type LessonInput = z.infer<typeof lessonSchema>;

export interface Conflict {
  type: "teacher" | "class" | "room";
  message: string;
  lessonId: number;
}

/** Yeni/dəyişən dərs üçün konfliktləri tapır (vaxt kəsişməsi ilə). */
export async function findConflicts(input: LessonInput, yearId: number, excludeId: number | null, tx: Db = db): Promise<Conflict[]> {
  const rows = await tx.query<LessonRow & { overlaps: number }>(
    `${BASE}
      WHERE l.school_year_id = ? AND l.day_of_week = ? AND l.id <> ?
        AND l.start_time < ? AND l.end_time > ?
        AND (l.teacher_id = ? OR l.class_id = ? OR (?::text IS NOT NULL AND l.room = ?))`,
    [yearId, input.dayOfWeek, excludeId ?? 0, input.endTime, input.startTime, input.teacherId, input.classId, input.room ?? null, input.room ?? null]
  );
  const out: Conflict[] = [];
  for (const r of rows) {
    if (r.teacher_id === input.teacherId) out.push({ type: "teacher", lessonId: r.id, message: `Müəllim ${r.teacher_name} bu vaxtda ${r.class_name} sinfində ${r.subject_name} dərsindədir (${r.start_time}–${r.end_time}).` });
    if (r.class_id === input.classId) out.push({ type: "class", lessonId: r.id, message: `${r.class_name} sinfinin bu vaxtda artıq ${r.subject_name} dərsi var (${r.start_time}–${r.end_time}).` });
    if (input.room && r.room === input.room) out.push({ type: "room", lessonId: r.id, message: `${input.room} kabinetində bu vaxtda ${r.class_name} sinfinin dərsi var.` });
  }
  return out;
}

async function validateRefs(input: LessonInput, yearId: number, tx: Db) {
  const cls = await tx.queryOne("SELECT id FROM classes WHERE id = ? AND school_year_id = ?", [input.classId, yearId]);
  if (!cls) throw Errors.badRequest("Sinif aktiv tədris ilinə aid deyil.", { classId: "Sinif tapılmadı." });
  const t = await tx.queryOne("SELECT id FROM teachers WHERE id = ? AND deleted_at IS NULL AND is_active = 1", [input.teacherId]);
  if (!t) throw Errors.badRequest("Müəllim tapılmadı.", { teacherId: "Müəllim tapılmadı." });
  const s = await tx.queryOne("SELECT id FROM subjects WHERE id = ?", [input.subjectId]);
  if (!s) throw Errors.badRequest("Fənn tapılmadı.", { subjectId: "Fənn tapılmadı." });
}

function conflictError(conflicts: Conflict[]) {
  const err = new AppError(409, "SCHEDULE_CONFLICT", conflicts.map((c) => c.message).join(" "));
  return err;
}

export async function createLesson(userId: number, input: LessonInput, req?: NextRequest) {
  const year = await requireActiveYear();
  return transaction(async (tx) => {
    await validateRefs(input, year.id, tx);
    const conflicts = await findConflicts(input, year.id, null, tx);
    if (conflicts.length) throw conflictError(conflicts);
    const res = await tx.execute(
      `INSERT INTO lessons (class_id, subject_id, teacher_id, school_year_id, day_of_week, period, start_time, end_time, room)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.classId, input.subjectId, input.teacherId, year.id, input.dayOfWeek, input.period, input.startTime, input.endTime, input.room ?? null]
    );
    await tx.execute(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id, school_year_id) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      [input.classId, input.subjectId, input.teacherId, year.id]
    );
    await audit({ userId, action: "lesson.create", entityType: "lesson", entityId: res.insertId, newValues: input, req }, tx);
    return { id: res.insertId };
  });
}

export async function updateLesson(userId: number, lessonId: number, input: LessonInput, req?: NextRequest) {
  const year = await requireActiveYear();
  return transaction(async (tx) => {
    const old = await tx.queryOne("SELECT * FROM lessons WHERE id = ? AND school_year_id = ?", [lessonId, year.id]);
    if (!old) throw Errors.notFound("Dərs");
    await validateRefs(input, year.id, tx);
    const conflicts = await findConflicts(input, year.id, lessonId, tx);
    if (conflicts.length) throw conflictError(conflicts);
    await tx.execute(
      `UPDATE lessons SET class_id = ?, subject_id = ?, teacher_id = ?, day_of_week = ?, period = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?`,
      [input.classId, input.subjectId, input.teacherId, input.dayOfWeek, input.period, input.startTime, input.endTime, input.room ?? null, lessonId]
    );
    await audit({ userId, action: "lesson.update", entityType: "lesson", entityId: lessonId, oldValues: old, newValues: input, req }, tx);
    return { id: lessonId };
  });
}

export async function deleteLesson(userId: number, lessonId: number, req?: NextRequest) {
  await transaction(async (tx) => {
    const old = await tx.queryOne("SELECT * FROM lessons WHERE id = ?", [lessonId]);
    if (!old) throw Errors.notFound("Dərs");
    await tx.execute("DELETE FROM lessons WHERE id = ?", [lessonId]);
    await audit({ userId, action: "lesson.delete", entityType: "lesson", entityId: lessonId, oldValues: old, req }, tx);
  });
}

/** Mövcud cədvəldəki bütün müəllim konfliktləri (view: schedule_conflicts + vaxt kəsişməsi). */
export async function allConflicts() {
  const year = await requireActiveYear();
  return db.query<{ a_id: number; b_id: number; teacher_name: string; day_of_week: number; class_a: string; class_b: string; start_a: string; start_b: string }>(
    `SELECT l1.id AS a_id, l2.id AS b_id, CONCAT(t.first_name, ' ', t.last_name) AS teacher_name, l1.day_of_week,
            c1.name AS class_a, c2.name AS class_b, to_char(l1.start_time, 'HH24:MI') AS start_a, to_char(l2.start_time, 'HH24:MI') AS start_b
       FROM lessons l1
       JOIN lessons l2 ON l1.teacher_id = l2.teacher_id AND l1.day_of_week = l2.day_of_week AND l1.school_year_id = l2.school_year_id
                       AND l1.id < l2.id AND l1.start_time < l2.end_time AND l2.start_time < l1.end_time
       JOIN teachers t ON t.id = l1.teacher_id
       JOIN classes c1 ON c1.id = l1.class_id
       JOIN classes c2 ON c2.id = l2.class_id
      WHERE l1.school_year_id = ?
      ORDER BY l1.day_of_week, l1.start_time`,
    [year.id]
  );
}

export async function bellTimes() {
  return db.query<{ shift: number; period: number; start_time: string; end_time: string }>(
    "SELECT shift, period, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time FROM bell_times ORDER BY shift, period"
  );
}
