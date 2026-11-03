/** Davamiyyət: gündəlik (period=0) və dərs üzrə (period=1..8) qeydiyyat, hesabatlar. */
import "server-only";
import type { NextRequest } from "next/server";
import { db, transaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { Errors } from "@/lib/http";
import { can } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import { z, id, isoDate, optionalText } from "@/lib/validation";
import { isoWeekday } from "@/lib/format";
import { homeroomClassIds, requireActiveYear, studentAudienceUserIds } from "./access";
import { notifyUsers } from "./notifications";

export const ATTENDANCE_STATUS = {
  present: "İştirak etdi",
  late: "Gecikdi",
  excused: "Üzrlü səbəbdən iştirak etmədi",
  unexcused: "Üzrsüz iştirak etmədi",
} as const;
export type AttendanceStatus = keyof typeof ATTENDANCE_STATUS;
const statusEnum = z.enum(["present", "late", "excused", "unexcused"]);

export const saveAttendanceSchema = z.object({
  classId: id,
  date: isoDate,
  period: z.coerce.number().int().min(0).max(8),
  entries: z.array(z.object({ studentId: id, status: statusEnum, note: optionalText(255) })).min(1).max(60),
});

/** Davamiyyət qeyd etmək hüququ: period=0 → sinif rəhbəri; period>0 → həmin dərsin müəllimi. */
async function resolveMarkContext(user: CurrentUser, classId: number, date: string, period: number) {
  const year = await requireActiveYear();
  if (date < year.start_date || date > year.end_date) throw Errors.badRequest("Tarix aktiv tədris ilindən kənardadır.");
  if (period === 0) {
    if (can(user, "attendance.manage_all")) return { lessonId: null, subjectId: null };
    if (user.teacherId && (await homeroomClassIds(user.teacherId)).includes(classId)) return { lessonId: null, subjectId: null };
    throw Errors.forbidden();
  }
  const lesson = await db.queryOne<{ id: number; teacher_id: number; subject_id: number }>(
    "SELECT id, teacher_id, subject_id FROM lessons WHERE class_id = ? AND day_of_week = ? AND period = ? AND school_year_id = ?",
    [classId, isoWeekday(date), period, year.id]
  );
  if (!lesson) throw Errors.badRequest("Bu gün və saatda sinfin cədvəldə dərsi yoxdur.");
  if (!can(user, "attendance.manage_all") && lesson.teacher_id !== user.teacherId) throw Errors.forbidden();
  return { lessonId: lesson.id, subjectId: lesson.subject_id };
}

export async function canMarkAttendance(user: CurrentUser, classId: number, date: string, period: number) {
  try {
    await resolveMarkContext(user, classId, date, period);
    return true;
  } catch {
    return false;
  }
}

export async function getClassAttendance(user: CurrentUser, classId: number, date: string, period: number) {
  const ctx = await resolveMarkContext(user, classId, date, period);
  const rows = await db.query<{ id: number; first_name: string; last_name: string; status: AttendanceStatus | null; note: string | null }>(
    `SELECT s.id, s.first_name, s.last_name, a.status, a.note
       FROM students s
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ? AND a.period = ?
      WHERE s.class_id = ? AND s.deleted_at IS NULL
      ORDER BY s.last_name, s.first_name`,
    [date, period, classId]
  );
  return { ...ctx, students: rows };
}

export async function saveAttendance(user: CurrentUser, input: z.infer<typeof saveAttendanceSchema>, req?: NextRequest) {
  const ctx = await resolveMarkContext(user, input.classId, input.date, input.period);
  const ids = input.entries.map((e) => e.studentId);
  if (new Set(ids).size !== ids.length) throw Errors.badRequest("Eyni şagird təkrarlanır.");
  const inClass = await db.query<{ id: number }>("SELECT id FROM students WHERE id IN (?) AND class_id = ? AND deleted_at IS NULL", [ids, input.classId]);
  if (inClass.length !== ids.length) throw Errors.badRequest("Seçilmiş şagirdlərin bəziləri bu sinifdə deyil.");

  const existing = await db.query<{ id: number; student_id: number; status: AttendanceStatus; note: string | null }>(
    "SELECT id, student_id, status, note FROM attendance WHERE student_id IN (?) AND date = ? AND period = ?",
    [ids, input.date, input.period]
  );
  const byStudent = new Map(existing.map((r) => [r.student_id, r]));
  const changedToAbsent: { studentId: number; status: AttendanceStatus }[] = [];

  await transaction(async (tx) => {
    for (const e of input.entries) {
      const prev = byStudent.get(e.studentId);
      if (prev && prev.status === e.status && (prev.note ?? null) === (e.note ?? null)) continue;
      if (prev) {
        await tx.execute("UPDATE attendance SET status = ?, note = ?, marked_by = ?, lesson_id = ?, subject_id = ? WHERE id = ?", [
          e.status, e.note ?? null, user.id, ctx.lessonId, ctx.subjectId, prev.id,
        ]);
        await audit({ userId: user.id, action: "attendance.update", entityType: "attendance", entityId: prev.id, oldValues: prev, newValues: e, req }, tx);
      } else {
        const res = await tx.execute(
          `INSERT INTO attendance (student_id, lesson_id, class_id, date, period, subject_id, status, marked_by, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [e.studentId, ctx.lessonId, input.classId, input.date, input.period, ctx.subjectId, e.status, user.id, e.note ?? null]
        );
        await audit({ userId: user.id, action: "attendance.create", entityType: "attendance", entityId: res.insertId, newValues: { ...e, date: input.date, period: input.period }, req }, tx);
      }
      if (e.status !== "present" && prev?.status !== e.status) changedToAbsent.push({ studentId: e.studentId, status: e.status });
    }
  });

  if (changedToAbsent.length) {
    const audience = await studentAudienceUserIds(changedToAbsent.map((c) => c.studentId));
    for (const c of changedToAbsent) {
      await notifyUsers(audience.get(c.studentId) || [], {
        title: "Davamiyyət qeydə alındı",
        message: `${input.date.split("-").reverse().join(".")}${input.period ? `, ${input.period}-ci dərs` : ""}: ${ATTENDANCE_STATUS[c.status]}`,
        type: "attendance",
        link: "/attendance",
        entityType: "attendance",
      });
    }
  }
  return { saved: input.entries.length };
}

/** Şagirdin davamiyyət tarixçəsi və xülasəsi (icazə əvvəlcədən yoxlanılır). */
export async function studentAttendance(studentId: number, from: string, to: string) {
  const records = await db.query<{ date: string; period: number; status: AttendanceStatus; note: string | null; subject_name: string | null }>(
    `SELECT a.date, a.period, a.status, a.note, s.name_az AS subject_name
       FROM attendance a LEFT JOIN subjects s ON s.id = a.subject_id
      WHERE a.student_id = ? AND a.date BETWEEN ? AND ?
      ORDER BY a.date DESC, a.period`,
    [studentId, from, to]
  );
  const summary = { present: 0, late: 0, excused: 0, unexcused: 0 } as Record<AttendanceStatus, number>;
  for (const r of records) summary[r.status]++;
  return { records, summary };
}

/** Sinif üzrə dövri hesabat (sinif rəhbəri və rəhbərlik üçün). */
export async function classAttendanceReport(classId: number, from: string, to: string) {
  return db.query<{ student_id: number; student_name: string; present: number; late: number; excused: number; unexcused: number }>(
    `SELECT s.id AS student_id, CONCAT(s.last_name, ' ', s.first_name) AS student_name,
            SUM(a.status = 'present') AS present, SUM(a.status = 'late') AS late,
            SUM(a.status = 'excused') AS excused, SUM(a.status = 'unexcused') AS unexcused
       FROM students s
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date BETWEEN ? AND ?
      WHERE s.class_id = ? AND s.deleted_at IS NULL
      GROUP BY s.id, student_name
      ORDER BY student_name`,
    [from, to, classId]
  ).then((rows) => rows.map((r) => ({ ...r, present: Number(r.present || 0), late: Number(r.late || 0), excused: Number(r.excused || 0), unexcused: Number(r.unexcused || 0) })));
}
