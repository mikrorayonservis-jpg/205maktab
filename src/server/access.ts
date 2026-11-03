/**
 * Mərkəzləşdirilmiş məlumat əhatəsi (IDOR müdafiəsi). Hər akademik sorğu bu funksiyalardan keçir.
 *  - Şagird: yalnız özü
 *  - Valideyn: yalnız parent_student ilə bağlanmış uşaqları
 *  - Müəllim: yalnız class_subjects-də ona təyin edilmiş sinif+fənn; sinif rəhbəri öz sinfinin hamısı
 *  - *.view_all icazəsi: hamısı
 */
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { can, type Permission } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import { Errors } from "@/lib/http";

export interface SchoolYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

export const activeSchoolYear = cache(async (): Promise<SchoolYear | null> => {
  return db.queryOne<SchoolYear>("SELECT id, name, start_date, end_date FROM school_years WHERE is_active = 1 ORDER BY start_date DESC LIMIT 1");
});

export async function requireActiveYear(): Promise<SchoolYear> {
  const y = await activeSchoolYear();
  if (!y) throw Errors.badRequest("Aktiv tədris ili təyin edilməyib. Administrator panelindən tədris ilini aktivləşdirin.");
  return y;
}

export interface Assignment {
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  grade_level: number;
}

export const teacherAssignments = cache(async (teacherId: number): Promise<Assignment[]> => {
  const year = await activeSchoolYear();
  if (!year) return [];
  return db.query<Assignment>(
    `SELECT cs.class_id, c.name AS class_name, c.grade_level, cs.subject_id, s.name_az AS subject_name
       FROM class_subjects cs
       JOIN classes c ON c.id = cs.class_id
       JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.teacher_id = ? AND cs.school_year_id = ?
      ORDER BY c.grade_level, c.name, s.name_az`,
    [teacherId, year.id]
  );
});

export const homeroomClassIds = cache(async (teacherId: number): Promise<number[]> => {
  const year = await activeSchoolYear();
  if (!year) return [];
  const rows = await db.query<{ id: number }>("SELECT id FROM classes WHERE class_teacher_id = ? AND school_year_id = ?", [teacherId, year.id]);
  return rows.map((r) => r.id);
});

export const parentChildIds = cache(async (parentId: number): Promise<number[]> => {
  const rows = await db.query<{ student_id: number }>(
    `SELECT ps.student_id FROM parent_student ps JOIN students s ON s.id = ps.student_id
      WHERE ps.parent_id = ? AND s.deleted_at IS NULL`,
    [parentId]
  );
  return rows.map((r) => r.student_id);
});

/** Müəllim bu sinifdə bu fənni tədris edirmi (və ya ümumi idarəetmə icazəsi varmı)? */
export async function canTeach(user: CurrentUser, classId: number, subjectId: number, managePerm: Permission): Promise<boolean> {
  if (can(user, managePerm)) return true;
  if (!user.teacherId) return false;
  const list = await teacherAssignments(user.teacherId);
  return list.some((a) => a.class_id === classId && a.subject_id === subjectId);
}

export async function assertCanTeach(user: CurrentUser, classId: number, subjectId: number, managePerm: Permission) {
  if (!(await canTeach(user, classId, subjectId, managePerm))) throw Errors.forbidden();
}

/** Sinfin məlumatlarına (siyahı, davamiyyət hesabatı) baxış hüququ. */
export async function canViewClass(user: CurrentUser, classId: number): Promise<boolean> {
  if (can(user, "students.view_all") || can(user, "attendance.view_all") || can(user, "grades.view_all")) return true;
  if (!user.teacherId) return false;
  if ((await homeroomClassIds(user.teacherId)).includes(classId)) return true;
  return (await teacherAssignments(user.teacherId)).some((a) => a.class_id === classId);
}

/** Şagirdin profilinə/nəticələrinə baxış hüququ. */
export async function canViewStudent(user: CurrentUser, studentId: number): Promise<boolean> {
  if (user.studentId === studentId) return true;
  if (user.parentId && (await parentChildIds(user.parentId)).includes(studentId)) return true;
  const st = await db.queryOne<{ class_id: number | null }>("SELECT class_id FROM students WHERE id = ? AND deleted_at IS NULL", [studentId]);
  if (!st) return false;
  if (can(user, "students.view_all") || can(user, "grades.view_all")) return true;
  if (st.class_id && user.teacherId) return canViewClass(user, st.class_id);
  return false;
}

export async function assertCanViewStudent(user: CurrentUser, studentId: number) {
  if (!(await canViewStudent(user, studentId))) throw Errors.notFound("Şagird");
}

/** İstifadəçinin baxa biləcəyi şagirdlərin siyahısı (şagird → özü, valideyn → uşaqları). */
export async function ownStudentIds(user: CurrentUser): Promise<number[]> {
  if (user.studentId) return [user.studentId];
  if (user.parentId) return parentChildIds(user.parentId);
  return [];
}

export async function assertStudentInClass(studentId: number, classId: number) {
  const row = await db.queryOne("SELECT 1 AS x FROM students WHERE id = ? AND class_id = ? AND deleted_at IS NULL", [studentId, classId]);
  if (!row) throw Errors.badRequest("Şagird bu sinifdə qeydiyyatda deyil.");
}

/**
 * Qiymət cədvəli üçün SQL əhatə şərti (alias `g`). Parametrlər ayrıca qaytarılır.
 * Bu şərt hər siyahı sorğusuna məcburi əlavə edilir.
 */
export function gradeScopeSql(user: CurrentUser, alias = "g"): { sql: string; params: unknown[] } {
  if (can(user, "grades.view_all")) return { sql: "1=1", params: [] };
  const parts: string[] = [];
  const params: unknown[] = [];
  if (user.studentId) {
    parts.push(`${alias}.student_id = ?`);
    params.push(user.studentId);
  }
  if (user.parentId) {
    parts.push(`${alias}.student_id IN (SELECT student_id FROM parent_student WHERE parent_id = ?)`);
    params.push(user.parentId);
  }
  if (user.teacherId) {
    parts.push(
      `(EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.class_id = ${alias}.class_id AND cs.subject_id = ${alias}.subject_id AND cs.teacher_id = ?)
        OR ${alias}.class_id IN (SELECT id FROM classes WHERE class_teacher_id = ?))`
    );
    params.push(user.teacherId, user.teacherId);
  }
  return parts.length ? { sql: `(${parts.join(" OR ")})`, params } : { sql: "0=1", params: [] };
}

/** Davamiyyət və ev tapşırıqları üçün sinif əsaslı əhatə (alias-da class_id və student_id sütunu). */
export function classScopeSql(user: CurrentUser, viewAllPerm: Permission, alias: string, studentColumn?: string): { sql: string; params: unknown[] } {
  if (can(user, viewAllPerm)) return { sql: "1=1", params: [] };
  const parts: string[] = [];
  const params: unknown[] = [];
  if (user.studentId) {
    parts.push(studentColumn ? `${alias}.${studentColumn} = ?` : `${alias}.class_id = (SELECT class_id FROM students WHERE id = ?)`);
    params.push(user.studentId);
  }
  if (user.parentId) {
    parts.push(
      studentColumn
        ? `${alias}.${studentColumn} IN (SELECT student_id FROM parent_student WHERE parent_id = ?)`
        : `${alias}.class_id IN (SELECT s.class_id FROM parent_student ps JOIN students s ON s.id = ps.student_id WHERE ps.parent_id = ?)`
    );
    params.push(user.parentId);
  }
  if (user.teacherId) {
    parts.push(
      `(${alias}.class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = ?) OR ${alias}.class_id IN (SELECT id FROM classes WHERE class_teacher_id = ?))`
    );
    params.push(user.teacherId, user.teacherId);
  }
  return parts.length ? { sql: `(${parts.join(" OR ")})`, params } : { sql: "0=1", params: [] };
}

/** Şagird və onun valideynlərinin istifadəçi ID-ləri (bildirişlər üçün). */
export async function studentAudienceUserIds(studentIds: number[]): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (!studentIds.length) return map;
  const rows = await db.query<{ student_id: number; user_id: number }>(
    `SELECT s.id AS student_id, s.user_id FROM students s WHERE s.id IN (?) AND s.user_id IS NOT NULL
     UNION
     SELECT ps.student_id, p.user_id FROM parent_student ps JOIN parents p ON p.id = ps.parent_id WHERE ps.student_id IN (?)`,
    [studentIds, studentIds]
  );
  for (const r of rows) {
    const list = map.get(r.student_id) || [];
    list.push(r.user_id);
    map.set(r.student_id, list);
  }
  return map;
}
