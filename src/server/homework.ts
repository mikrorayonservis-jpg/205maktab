/** Ev tapşırıqları və təqdimatlar. Fayllar şəxsi saxlanır və /api/files/:id ilə icazə yoxlanaraq verilir. */
import "server-only";
import type { NextRequest } from "next/server";
import { db, transaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { Errors } from "@/lib/http";
import { can } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import { z, id, isoDate, optionalText, shortText } from "@/lib/validation";
import { fileUrl } from "@/lib/storage";
import { assertCanTeach, classScopeSql, homeroomClassIds, ownStudentIds, requireActiveYear, studentAudienceUserIds } from "./access";
import { notifyUsers } from "./notifications";

export const homeworkSchema = z.object({
  classId: id,
  subjectId: id,
  title: shortText(255),
  description: optionalText(10000),
  dueDate: isoDate,
  fileIds: z.array(id).max(5).default([]),
});

export const submissionSchema = z
  .object({ answer: optionalText(10000), fileId: id.nullable().optional() })
  .refine((v) => Boolean(v.answer) || Boolean(v.fileId), { message: "Cavab mətni və ya fayl əlavə edin.", path: ["answer"] });

export const gradeSubmissionSchema = z.object({
  grade: z.coerce.number().int().min(2).max(5).nullable(),
  feedback: optionalText(5000),
  status: z.enum(["graded", "returned"]).default("graded"),
});

async function assertOwnFiles(user: CurrentUser, fileIds: number[], purpose: string) {
  if (!fileIds.length) return;
  const rows = await db.query<{ id: number }>("SELECT id FROM files WHERE id IN (?) AND owner_user_id = ? AND purpose = ?", [fileIds, user.id, purpose]);
  if (rows.length !== new Set(fileIds).size) throw Errors.badRequest("Əlavə edilmiş fayllardan bəziləri tapılmadı.");
}

async function teacherIdFor(user: CurrentUser, classId: number, subjectId: number): Promise<number> {
  if (user.teacherId) return user.teacherId;
  const year = await requireActiveYear();
  const row = await db.queryOne<{ teacher_id: number | null }>("SELECT teacher_id FROM class_subjects WHERE class_id = ? AND subject_id = ? AND school_year_id = ?", [classId, subjectId, year.id]);
  if (!row?.teacher_id) throw Errors.badRequest("Bu sinif və fənn üçün müəllim təyin edilməyib.");
  return row.teacher_id;
}

export async function createHomework(user: CurrentUser, input: z.infer<typeof homeworkSchema>, req?: NextRequest) {
  await assertCanTeach(user, input.classId, input.subjectId, "school.manage");
  await assertOwnFiles(user, input.fileIds, "homework");
  const year = await requireActiveYear();
  const teacherId = await teacherIdFor(user, input.classId, input.subjectId);
  const hwId = await transaction(async (tx) => {
    const res = await tx.execute(
      `INSERT INTO homework (title, description, subject_id, class_id, teacher_id, school_year_id, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.title, input.description ?? null, input.subjectId, input.classId, teacherId, year.id, input.dueDate, user.id]
    );
    for (const f of input.fileIds) await tx.execute("INSERT INTO homework_files (homework_id, file_id) VALUES (?, ?)", [res.insertId, f]);
    await audit({ userId: user.id, action: "homework.create", entityType: "homework", entityId: res.insertId, newValues: input, req }, tx);
    return res.insertId;
  });
  const students = await db.query<{ id: number }>("SELECT id FROM students WHERE class_id = ? AND deleted_at IS NULL", [input.classId]);
  const audience = await studentAudienceUserIds(students.map((s) => s.id));
  await notifyUsers([...audience.values()].flat(), {
    title: "Yeni ev tapşırığı verildi",
    message: `${input.title} — son tarix: ${input.dueDate.split("-").reverse().join(".")}`,
    type: "homework",
    link: `/homework/${hwId}`,
    entityType: "homework",
    entityId: hwId,
  });
  return { id: hwId };
}

async function loadHomework(hwId: number) {
  const hw = await db.queryOne(
    `SELECT h.*, s.name_az AS subject_name, c.name AS class_name, CONCAT(t.first_name, ' ', t.last_name) AS teacher_name
       FROM homework h JOIN subjects s ON s.id = h.subject_id JOIN classes c ON c.id = h.class_id JOIN teachers t ON t.id = h.teacher_id
      WHERE h.id = ? AND h.deleted_at IS NULL`,
    [hwId]
  );
  if (!hw) throw Errors.notFound("Ev tapşırığı");
  return hw;
}

export async function canViewHomework(user: CurrentUser, hw: { class_id: number }): Promise<boolean> {
  const scope = classScopeSql(user, "homework.view_all", "h");
  const row = await db.queryOne(`SELECT 1 AS x FROM (SELECT ? AS class_id) h WHERE ${scope.sql}`, [hw.class_id, ...scope.params]);
  return Boolean(row);
}

/** Tapşırığı idarə etmək (redaktə, təqdimatlara baxış, qiymətləndirmə) hüququ. */
export async function canManageHomework(user: CurrentUser, hw: { teacher_id: number; class_id: number }): Promise<boolean> {
  if (can(user, "school.manage")) return true;
  if (!user.teacherId) return false;
  return hw.teacher_id === user.teacherId;
}

async function canReviewSubmissions(user: CurrentUser, hw: { teacher_id: number; class_id: number }) {
  if (await canManageHomework(user, hw)) return true;
  if (can(user, "homework.view_all")) return true;
  return Boolean(user.teacherId && (await homeroomClassIds(user.teacherId)).includes(hw.class_id));
}

export async function getHomework(user: CurrentUser, hwId: number) {
  const hw = await loadHomework(hwId);
  if (!(await canViewHomework(user, hw))) throw Errors.notFound("Ev tapşırığı");
  const files = await db.query<{ id: number; original_name: string; storage_key: string; visibility: string; size_bytes: number }>(
    "SELECT f.id, f.original_name, f.storage_key, f.visibility, f.size_bytes FROM homework_files hf JOIN files f ON f.id = hf.file_id WHERE hf.homework_id = ?",
    [hwId]
  );
  const myStudentIds = await ownStudentIds(user);
  const mySubmissions = myStudentIds.length
    ? await db.query(
        `SELECT hs.id, hs.student_id, hs.answer_text, hs.file_id, hs.submitted_at, hs.grade, hs.feedback, hs.status, f.original_name AS file_name
           FROM homework_submissions hs LEFT JOIN files f ON f.id = hs.file_id
          WHERE hs.homework_id = ? AND hs.student_id IN (?)`,
        [hwId, myStudentIds]
      )
    : [];
  return {
    homework: hw,
    files: files.map((f) => ({ id: f.id, name: f.original_name, size: f.size_bytes, url: fileUrl(f) })),
    mySubmissions,
    canManage: await canManageHomework(user, hw),
    canReview: await canReviewSubmissions(user, hw),
    canSubmit: Boolean(user.studentId) && (await db.queryOne("SELECT 1 AS x FROM students WHERE id = ? AND class_id = ?", [user.studentId, hw.class_id])) !== null,
  };
}

export async function listHomework(user: CurrentUser, q: { classId?: number; upcoming?: boolean; mine?: boolean; limit?: number }) {
  const scope = classScopeSql(user, "homework.view_all", "h");
  const where = ["h.deleted_at IS NULL", scope.sql];
  const params: unknown[] = [...scope.params];
  if (q.classId) { where.push("h.class_id = ?"); params.push(q.classId); }
  if (q.upcoming) where.push("h.due_date >= CURDATE()");
  if (q.mine && user.teacherId) { where.push("h.teacher_id = ?"); params.push(user.teacherId); }
  const studentIds = await ownStudentIds(user);
  params.push(q.limit ?? 100);
  const rows = await db.query(
    `SELECT h.id, h.title, h.due_date, h.class_id, c.name AS class_name, s.name_az AS subject_name,
            CONCAT(t.first_name, ' ', t.last_name) AS teacher_name, h.created_at,
            (SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id = h.id) AS submission_count
       FROM homework h JOIN classes c ON c.id = h.class_id JOIN subjects s ON s.id = h.subject_id JOIN teachers t ON t.id = h.teacher_id
      WHERE ${where.join(" AND ")}
      ORDER BY h.due_date DESC, h.id DESC LIMIT ?`,
    params
  );
  if (!studentIds.length) return rows;
  const subs = rows.length
    ? await db.query<{ homework_id: number; student_id: number; status: string; grade: number | null }>(
        "SELECT homework_id, student_id, status, grade FROM homework_submissions WHERE homework_id IN (?) AND student_id IN (?)",
        [rows.map((r) => r.id), studentIds]
      )
    : [];
  return rows.map((r) => ({ ...r, submissions: subs.filter((s) => s.homework_id === r.id) }));
}

export async function updateHomework(user: CurrentUser, hwId: number, input: z.infer<typeof homeworkSchema>, req?: NextRequest) {
  const hw = await loadHomework(hwId);
  if (!(await canManageHomework(user, hw))) throw Errors.forbidden();
  await assertCanTeach(user, input.classId, input.subjectId, "school.manage");
  await assertOwnFiles(user, input.fileIds, "homework");
  await transaction(async (tx) => {
    await tx.execute("UPDATE homework SET title = ?, description = ?, class_id = ?, subject_id = ?, due_date = ? WHERE id = ?", [
      input.title, input.description ?? null, input.classId, input.subjectId, input.dueDate, hwId,
    ]);
    for (const f of input.fileIds) await tx.execute("INSERT IGNORE INTO homework_files (homework_id, file_id) VALUES (?, ?)", [hwId, f]);
    await audit({ userId: user.id, action: "homework.update", entityType: "homework", entityId: hwId, oldValues: hw, newValues: input, req }, tx);
  });
}

export async function deleteHomework(user: CurrentUser, hwId: number, req?: NextRequest) {
  const hw = await loadHomework(hwId);
  if (!(await canManageHomework(user, hw))) throw Errors.forbidden();
  await db.execute("UPDATE homework SET deleted_at = NOW() WHERE id = ?", [hwId]);
  await audit({ userId: user.id, action: "homework.delete", entityType: "homework", entityId: hwId, oldValues: hw, req });
}

export async function submitHomework(user: CurrentUser, hwId: number, input: z.infer<typeof submissionSchema>, req?: NextRequest) {
  if (!user.studentId) throw Errors.forbidden();
  const hw = await loadHomework(hwId);
  const inClass = await db.queryOne("SELECT 1 AS x FROM students WHERE id = ? AND class_id = ? AND deleted_at IS NULL", [user.studentId, hw.class_id]);
  if (!inClass) throw Errors.notFound("Ev tapşırığı");
  if (input.fileId) await assertOwnFiles(user, [input.fileId], "submission");
  const existing = await db.queryOne<{ id: number; status: string }>("SELECT id, status FROM homework_submissions WHERE homework_id = ? AND student_id = ?", [hwId, user.studentId]);
  if (existing && existing.status === "graded") throw Errors.conflict("Qiymətləndirilmiş təqdimat dəyişdirilə bilməz.");
  if (existing) {
    await db.execute("UPDATE homework_submissions SET answer_text = ?, file_id = ?, status = 'submitted', submitted_at = NOW() WHERE id = ?", [input.answer ?? null, input.fileId ?? null, existing.id]);
  } else {
    await db.execute("INSERT INTO homework_submissions (homework_id, student_id, answer_text, file_id) VALUES (?, ?, ?, ?)", [hwId, user.studentId, input.answer ?? null, input.fileId ?? null]);
  }
  await audit({ userId: user.id, action: existing ? "homework.resubmit" : "homework.submit", entityType: "homework", entityId: hwId, req });
  const teacher = await db.queryOne<{ user_id: number | null }>("SELECT user_id FROM teachers WHERE id = ?", [hw.teacher_id]);
  if (teacher?.user_id) {
    await notifyUsers([teacher.user_id], { title: "Ev tapşırığına cavab göndərildi", message: `${hw.class_name}: ${hw.title}`, type: "homework", link: `/homework/${hwId}`, entityType: "homework", entityId: hwId });
  }
}

export async function listSubmissions(user: CurrentUser, hwId: number) {
  const hw = await loadHomework(hwId);
  if (!(await canReviewSubmissions(user, hw))) throw Errors.forbidden();
  return db.query(
    `SELECT s.id AS student_id, CONCAT(s.last_name, ' ', s.first_name) AS student_name, hs.id, hs.answer_text, hs.file_id,
            f.original_name AS file_name, hs.submitted_at, hs.grade, hs.feedback, hs.status,
            (hs.submitted_at > CONCAT(?, ' 23:59:59')) AS is_late
       FROM students s
       LEFT JOIN homework_submissions hs ON hs.student_id = s.id AND hs.homework_id = ?
       LEFT JOIN files f ON f.id = hs.file_id
      WHERE s.class_id = ? AND s.deleted_at IS NULL
      ORDER BY student_name`,
    [hw.due_date, hwId, hw.class_id]
  );
}

export async function gradeSubmission(user: CurrentUser, submissionId: number, input: z.infer<typeof gradeSubmissionSchema>, req?: NextRequest) {
  const sub = await db.queryOne<{ id: number; homework_id: number; student_id: number; grade: number | null; feedback: string | null }>(
    "SELECT id, homework_id, student_id, grade, feedback FROM homework_submissions WHERE id = ?",
    [submissionId]
  );
  if (!sub) throw Errors.notFound("Təqdimat");
  const hw = await loadHomework(sub.homework_id);
  if (!(await canManageHomework(user, hw))) throw Errors.forbidden();
  await db.execute(
    "UPDATE homework_submissions SET grade = ?, feedback = ?, status = ?, graded_by = ?, graded_at = NOW() WHERE id = ?",
    [input.grade, input.feedback ?? null, input.status, user.teacherId ?? hw.teacher_id, submissionId]
  );
  await audit({ userId: user.id, action: "homework.grade", entityType: "homework_submission", entityId: submissionId, oldValues: sub, newValues: input, req });
  const audience = await studentAudienceUserIds([sub.student_id]);
  await notifyUsers(audience.get(sub.student_id) || [], {
    title: input.status === "returned" ? "Ev tapşırığı düzəliş üçün qaytarıldı" : "Ev tapşırığı qiymətləndirildi",
    message: `${hw.title}${input.grade ? `: ${input.grade}` : ""}`,
    type: "homework",
    link: `/homework/${hw.id}`,
    entityType: "homework",
    entityId: hw.id,
  });
}

/** Şəxsi fayla giriş hüququ: sahib, ev tapşırığının auditoriyası və ya təqdimatın baxışçıları. */
export async function canAccessPrivateFile(user: CurrentUser, fileId: number): Promise<boolean> {
  const f = await db.queryOne<{ owner_user_id: number | null; purpose: string }>("SELECT owner_user_id, purpose FROM files WHERE id = ?", [fileId]);
  if (!f) return false;
  if (f.owner_user_id === user.id) return true;
  const hwLinks = await db.query<{ homework_id: number }>("SELECT homework_id FROM homework_files WHERE file_id = ?", [fileId]);
  for (const l of hwLinks) {
    const hw = await db.queryOne<{ class_id: number }>("SELECT class_id FROM homework WHERE id = ? AND deleted_at IS NULL", [l.homework_id]);
    if (hw && (await canViewHomework(user, hw))) return true;
  }
  const subs = await db.query<{ homework_id: number; student_id: number }>("SELECT homework_id, student_id FROM homework_submissions WHERE file_id = ?", [fileId]);
  for (const s of subs) {
    if ((await ownStudentIds(user)).includes(s.student_id)) return true;
    const hw = await db.queryOne<{ teacher_id: number; class_id: number }>("SELECT teacher_id, class_id FROM homework WHERE id = ?", [s.homework_id]);
    if (hw && (await canReviewSubmissions(user, hw))) return true;
  }
  return false;
}
