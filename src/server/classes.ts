/**
 * Siniflər, sinif dəvət kodları və şagirdlərin siniflərə yerləşdirilməsi.
 *
 * Şagirdin sinfi heç vaxt istifadəçinin yazdığı mətndən götürülmür: kod serverdə class_invite_codes
 * cədvəlində tapılır və sinif ID-si oradan alınır. Sinif üzvlüyü mövcud qayda ilə saxlanılır:
 * students.class_id + students.school_year_id + class_students (tarixçə).
 * Bütün dəyişikliklər audit jurnalına yazılır; kodun özü yox, yalnız son 4 simvolu.
 */
import "server-only";
import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { db, transaction, type Db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { Errors } from "@/lib/http";
import { z, optionalId, optionalText } from "@/lib/validation";
import { codeHint, generateClassCode, gradeFromName, looksLikeClassCode, mapImportRows, normalizeClassCode, parseCsv, type ImportRow } from "@/lib/class-codes";
import type { CurrentUser } from "@/lib/auth/session";

const BATCH = 500;
export const MAX_IMPORT_ROWS = 5000;

export interface ClassRow {
  id: number;
  name: string;
  grade_level: number;
  school_year_id: number;
  school_year: string;
  shift: number;
  room: string | null;
  is_active: number;
  class_teacher_id: number | null;
  class_teacher: string | null;
  student_count: number;
  code: string | null;
  code_active: number | null;
  code_uses: number | null;
  code_max_uses: number | null;
  code_expires_at: string | null;
  created_at: string;
}

export async function activeSchoolYear(tx: Db = db) {
  return tx.queryOne<{ id: number; name: string }>("SELECT id, name FROM school_years WHERE is_active = 1 ORDER BY start_date DESC LIMIT 1");
}

/** Bir sorğu ilə: sinif + rəhbər + şagird sayı + cari kod (N+1 yoxdur) */
export async function listClasses(opts: { yearId?: number; includeInactive?: boolean } = {}) {
  const where = ["1=1"];
  const params: unknown[] = [];
  if (opts.yearId) { where.push("c.school_year_id = ?"); params.push(opts.yearId); }
  if (!opts.includeInactive) where.push("c.is_active = 1");
  return db.query<ClassRow>(
    `SELECT c.id, c.name, c.grade_level, c.school_year_id, y.name AS school_year, c.shift, c.room, c.is_active, c.created_at,
            c.class_teacher_id, NULLIF(CONCAT_WS(' ', t.last_name, t.first_name), '') AS class_teacher,
            COALESCE(sc.n, 0) AS student_count,
            k.code, k.is_active AS code_active, k.use_count AS code_uses, k.max_uses AS code_max_uses, k.expires_at AS code_expires_at
       FROM classes c
       JOIN school_years y ON y.id = c.school_year_id
       LEFT JOIN teachers t ON t.id = c.class_teacher_id
       LEFT JOIN (SELECT class_id, COUNT(*) AS n FROM students WHERE deleted_at IS NULL GROUP BY class_id) sc ON sc.class_id = c.id
       LEFT JOIN class_invite_codes k ON k.class_id = c.id AND k.revoked_at IS NULL
      WHERE ${where.join(" AND ")}
      ORDER BY c.grade_level, c.name`,
    params
  );
}

async function insertCode(tx: Db, classId: number, className: string, actorId: number, opts: { maxUses?: number | null; expiresAt?: string | null }) {
  // Toqquşma ehtimalı çox aşağıdır (31^5 ≈ 28 mln / sinif); unikal indeks təkrarı istisna edir
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateClassCode(className);
    const clash = await tx.queryOne("SELECT 1 FROM class_invite_codes WHERE code_norm = ?", [normalizeClassCode(code)]);
    if (clash) continue;
    await tx.execute(
      `INSERT INTO class_invite_codes (class_id, code, code_norm, max_uses, expires_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [classId, code, normalizeClassCode(code), opts.maxUses ?? null, opts.expiresAt ?? null, actorId, actorId]
    );
    return code;
  }
  throw new Error("Unikal sinif kodu yaradıla bilmədi");
}

async function assertTeacher(tx: Db, teacherId: number | null | undefined) {
  if (!teacherId) return;
  const t = await tx.queryOne<{ user_id: number | null }>("SELECT user_id FROM teachers WHERE id = ? AND deleted_at IS NULL", [teacherId]);
  if (!t) throw Errors.badRequest("Müəllim tapılmadı.", { classTeacherId: "Müəllim tapılmadı." });
  // Mövcud qayda (admin-crud): sinif rəhbərinin hesabına class_teacher rolu verilir
  if (t.user_id) await tx.execute("INSERT INTO user_roles (user_id, role_id) SELECT ?::int, id FROM roles WHERE code = 'class_teacher' ON CONFLICT DO NOTHING", [t.user_id]);
}

export const classBody = z.object({
  name: z.string().trim().min(1, "Sinif adını yazın.").max(20),
  gradeLevel: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1).max(12).optional()),
  schoolYearId: optionalId.optional(),
  classTeacherId: optionalId.optional(),
  shift: z.coerce.number().int().min(1).max(3).optional(),
  room: optionalText(20).optional(),
});

export interface ClassInput {
  name: string;
  gradeLevel?: number | null;
  schoolYearId?: number | null;
  classTeacherId?: number | null;
  shift?: number;
  room?: string | null;
}

export async function createClass(actor: CurrentUser, input: ClassInput, req?: NextRequest) {
  return transaction(async (tx) => {
    const yearId = input.schoolYearId ?? (await activeSchoolYear(tx))?.id;
    if (!yearId) throw Errors.badRequest("Aktiv tədris ili yoxdur. Əvvəlcə tədris ili yaradın.");
    const grade = input.gradeLevel ?? gradeFromName(input.name);
    if (!grade) throw Errors.badRequest("Sinif səviyyəsini göstərin.", { gradeLevel: "1–12 arası rəqəm." });
    const dup = await tx.queryOne("SELECT 1 FROM classes WHERE lower(name) = lower(?) AND school_year_id = ?", [input.name, yearId]);
    if (dup) throw Errors.conflict("Bu tədris ilində eyni adlı sinif artıq var.");
    await assertTeacher(tx, input.classTeacherId);
    const res = await tx.execute(
      "INSERT INTO classes (name, grade_level, school_year_id, class_teacher_id, shift, room) VALUES (?, ?, ?, ?, ?, ?)",
      [input.name, grade, yearId, input.classTeacherId ?? null, input.shift ?? 1, input.room ?? null]
    );
    const code = await insertCode(tx, res.insertId, input.name, actor.id, {});
    await audit({ userId: actor.id, action: "class.create", entityType: "class", entityId: res.insertId, newValues: { name: input.name, grade, schoolYearId: yearId, classTeacherId: input.classTeacherId ?? null, codeHint: codeHint(code) }, req }, tx);
    return { id: res.insertId, code };
  });
}

export async function updateClass(actor: CurrentUser, id: number, patch: Partial<ClassInput> & { isActive?: boolean }, req?: NextRequest) {
  return transaction(async (tx) => {
    const old = await tx.queryOne<Record<string, unknown>>("SELECT id, name, grade_level, class_teacher_id, shift, room, is_active FROM classes WHERE id = ? FOR UPDATE", [id]);
    if (!old) throw Errors.notFound("Sinif");
    const sets: string[] = [];
    const params: unknown[] = [];
    const set = (col: string, v: unknown) => { sets.push(`${col} = ?`); params.push(v); };
    if (patch.name !== undefined) {
      const dup = await tx.queryOne("SELECT 1 FROM classes WHERE lower(name) = lower(?) AND school_year_id = (SELECT school_year_id FROM classes WHERE id = ?) AND id <> ?", [patch.name, id, id]);
      if (dup) throw Errors.conflict("Bu tədris ilində eyni adlı sinif artıq var.");
      set("name", patch.name);
    }
    if (patch.gradeLevel !== undefined && patch.gradeLevel !== null) set("grade_level", patch.gradeLevel);
    if (patch.classTeacherId !== undefined) { await assertTeacher(tx, patch.classTeacherId); set("class_teacher_id", patch.classTeacherId); }
    if (patch.shift !== undefined) set("shift", patch.shift);
    if (patch.room !== undefined) set("room", patch.room);
    if (patch.isActive !== undefined) set("is_active", patch.isActive ? 1 : 0);
    if (!sets.length) return;
    await tx.execute(`UPDATE classes SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
    await audit({ userId: actor.id, action: patch.isActive === false ? "class.deactivate" : "class.update", entityType: "class", entityId: id, oldValues: old, newValues: patch, req }, tx);
  });
}

/** Köhnə kodu ləğv edib yenisini yaradır (köhnə kodla artıq qoşulmaq olmur) */
export async function rotateClassCode(actor: CurrentUser, classId: number, opts: { maxUses?: number | null; expiresAt?: string | null }, req?: NextRequest) {
  return transaction(async (tx) => {
    const cls = await tx.queryOne<{ name: string }>("SELECT name FROM classes WHERE id = ? FOR UPDATE", [classId]);
    if (!cls) throw Errors.notFound("Sinif");
    const old = await tx.queryOne<{ id: number; code: string }>("SELECT id, code FROM class_invite_codes WHERE class_id = ? AND revoked_at IS NULL", [classId]);
    if (old) await tx.execute("UPDATE class_invite_codes SET revoked_at = NOW(), is_active = 0, updated_by = ? WHERE id = ?", [actor.id, old.id]);
    const code = await insertCode(tx, classId, cls.name, actor.id, opts);
    await audit({ userId: actor.id, action: "class.code_rotate", entityType: "class", entityId: classId, oldValues: old ? { codeHint: codeHint(old.code) } : null, newValues: { codeHint: codeHint(code), maxUses: opts.maxUses ?? null, expiresAt: opts.expiresAt ?? null }, req }, tx);
    return { code };
  });
}

/** Kodu olmayan aktiv siniflərə (məs. miqrasiyadan əvvəl yaradılmış) kod yaradır */
export async function createMissingCodes(actor: CurrentUser, yearId: number, req?: NextRequest) {
  return transaction(async (tx) => {
    const missing = await tx.query<{ id: number; name: string }>(
      `SELECT c.id, c.name FROM classes c
        WHERE c.school_year_id = ? AND c.is_active = 1
          AND NOT EXISTS (SELECT 1 FROM class_invite_codes k WHERE k.class_id = c.id AND k.revoked_at IS NULL)
        ORDER BY c.id FOR UPDATE OF c`,
      [yearId]
    );
    for (const c of missing) await insertCode(tx, c.id, c.name, actor.id, {});
    if (missing.length) await audit({ userId: actor.id, action: "class.code_backfill", entityType: "class", newValues: { yearId, classIds: missing.map((c) => c.id) }, req }, tx);
    return { created: missing.length };
  });
}

/** Cari kodun statusu, limiti və müddəti */
export async function updateClassCode(actor: CurrentUser, classId: number, patch: { isActive?: boolean; maxUses?: number | null; expiresAt?: string | null }, req?: NextRequest) {
  return transaction(async (tx) => {
    const cur = await tx.queryOne<{ id: number; code: string; is_active: number; max_uses: number | null; expires_at: string | null }>(
      "SELECT id, code, is_active, max_uses, expires_at FROM class_invite_codes WHERE class_id = ? AND revoked_at IS NULL FOR UPDATE",
      [classId]
    );
    if (!cur) throw Errors.notFound("Sinif kodu");
    const sets: string[] = ["updated_by = ?"];
    const params: unknown[] = [actor.id];
    if (patch.isActive !== undefined) { sets.push("is_active = ?"); params.push(patch.isActive ? 1 : 0); }
    if (patch.maxUses !== undefined) { sets.push("max_uses = ?"); params.push(patch.maxUses); }
    if (patch.expiresAt !== undefined) { sets.push("expires_at = ?"); params.push(patch.expiresAt); }
    await tx.execute(`UPDATE class_invite_codes SET ${sets.join(", ")} WHERE id = ?`, [...params, cur.id]);
    await audit({ userId: actor.id, action: "class.code_update", entityType: "class", entityId: classId, oldValues: { codeHint: codeHint(cur.code), isActive: cur.is_active, maxUses: cur.max_uses, expiresAt: cur.expires_at }, newValues: patch, req }, tx);
  });
}

// ------------------------------------------------------------------ qeydiyyat

export interface ClassCodeTarget {
  codeId: number;
  classId: number;
  className: string;
  schoolYearId: number;
  hint: string;
}

/**
 * Qeydiyyat üçün kodu yoxlayır və sətri kilidləyir (FOR UPDATE: eyni anda iki qeydiyyat limiti aşa bilməz).
 * Uğursuzluq səbəbi istifadəçiyə ayrıca açıqlanmır (kodları yoxlamaq üçün istifadə olunmasın).
 */
export async function findUsableClassCode(tx: Db, code: string): Promise<ClassCodeTarget | null> {
  if (!looksLikeClassCode(code)) return null;
  const row = await tx.queryOne<{ id: number; class_id: number; name: string; school_year_id: number; code: string }>(
    `SELECT k.id, k.class_id, c.name, c.school_year_id, k.code
       FROM class_invite_codes k
       JOIN classes c ON c.id = k.class_id
       JOIN school_years y ON y.id = c.school_year_id
      WHERE k.code_norm = ? AND k.revoked_at IS NULL AND k.is_active = 1 AND c.is_active = 1 AND y.is_active = 1
        AND (k.expires_at IS NULL OR k.expires_at > NOW())
        AND (k.max_uses IS NULL OR k.use_count < k.max_uses)
      FOR UPDATE OF k`,
    [normalizeClassCode(code)]
  );
  return row ? { codeId: row.id, classId: row.class_id, className: row.name, schoolYearId: row.school_year_id, hint: codeHint(row.code) } : null;
}

export const INVALID_CLASS_CODE = "Sinif kodu yanlışdır, deaktivdir və ya müddəti bitib. Kodu sinif rəhbərindən yenidən alın.";

function newStudentCode() {
  return `ST-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

/**
 * Yeni hesab üçün şagird profili: CSV ilə əvvəlcədən yaradılmış, hesabsız, adı tam uyğun gələn
 * YEGANƏ profil varsa ona bağlanır (təkrar şagird yaranmır); əks halda yeni profil yaradılır.
 */
export async function attachStudentByClassCode(tx: Db, target: ClassCodeTarget, userId: number, names: { firstName: string; lastName: string }) {
  const candidates = await tx.query<{ id: number }>(
    `SELECT id FROM students WHERE class_id = ? AND user_id IS NULL AND deleted_at IS NULL
        AND lower(first_name) = lower(?) AND lower(last_name) = lower(?) LIMIT 2 FOR UPDATE`,
    [target.classId, names.firstName, names.lastName]
  );
  let studentId: number;
  if (candidates.length === 1) {
    studentId = candidates[0].id;
    await tx.execute("UPDATE students SET user_id = ? WHERE id = ? AND user_id IS NULL", [userId, studentId]);
  } else {
    const r = await tx.execute(
      "INSERT INTO students (user_id, student_code, first_name, last_name, class_id, school_year_id) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, newStudentCode(), names.firstName, names.lastName, target.classId, target.schoolYearId]
    );
    studentId = r.insertId;
  }
  await tx.execute("INSERT INTO class_students (class_id, student_id, school_year_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [target.classId, studentId, target.schoolYearId]);
  await tx.execute("INSERT INTO user_roles (user_id, role_id) SELECT ?::int, id FROM roles WHERE code = 'student' ON CONFLICT DO NOTHING", [userId]);
  await tx.execute("UPDATE class_invite_codes SET use_count = use_count + 1 WHERE id = ?", [target.codeId]);
  await audit({ userId, action: "class.code_redeem", entityType: "class", entityId: target.classId, newValues: { studentId, codeHint: target.hint, linkedExisting: candidates.length === 1 } }, tx);
  return studentId;
}

// ------------------------------------------------------------------ toplu yerləşdirmə

/** students.class_id + school_year_id + class_students tarixçəsi, partiyalarla (set-based) */
async function enrollMany(tx: Db, pairs: { studentId: number; classId: number; schoolYearId: number }[]) {
  for (let i = 0; i < pairs.length; i += BATCH) {
    const chunk = pairs.slice(i, i + BATCH);
    await tx.execute(
      `UPDATE students s SET class_id = v.class_id::int, school_year_id = v.year_id::int
         FROM (VALUES ?) AS v(id, class_id, year_id) WHERE s.id = v.id::int`,
      [chunk.map((p) => [p.studentId, p.classId, p.schoolYearId])]
    );
    await tx.execute(
      "INSERT INTO class_students (class_id, student_id, school_year_id) VALUES ? ON CONFLICT DO NOTHING",
      [chunk.map((p) => [p.classId, p.studentId, p.schoolYearId])]
    );
  }
}

export interface MovePreview {
  classId: number;
  className: string;
  moves: { id: number; name: string; from: string | null }[];
  unchanged: number;
  missing: number[];
}

async function planMove(tx: Db, studentIds: number[], classId: number): Promise<MovePreview> {
  const cls = await tx.queryOne<{ id: number; name: string; school_year_id: number; is_active: number }>("SELECT id, name, school_year_id, is_active FROM classes WHERE id = ?", [classId]);
  if (!cls) throw Errors.notFound("Sinif");
  if (!cls.is_active) throw Errors.badRequest("Deaktiv sinfə şagird köçürmək olmaz.");
  const ids = [...new Set(studentIds)];
  const rows = await tx.query<{ id: number; name: string; class_id: number | null; from_name: string | null }>(
    `SELECT s.id, CONCAT_WS(' ', s.last_name, s.first_name) AS name, s.class_id, c.name AS from_name
       FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id IN (?) AND s.deleted_at IS NULL ORDER BY s.last_name, s.first_name`,
    [ids]
  );
  const found = new Set(rows.map((r) => r.id));
  const moves = rows.filter((r) => r.class_id !== cls.id).map((r) => ({ id: r.id, name: r.name, from: r.from_name }));
  return { classId: cls.id, className: cls.name, moves, unchanged: rows.length - moves.length, missing: ids.filter((id) => !found.has(id)) };
}

/** Seçilmiş şagirdləri sinfə köçürür. preview=true → heç nə dəyişmir, yalnız plan qaytarılır. */
export async function moveStudents(actor: CurrentUser, studentIds: number[], classId: number, preview: boolean, req?: NextRequest) {
  return transaction(async (tx) => {
    const plan = await planMove(tx, studentIds, classId);
    if (preview || !plan.moves.length) return plan;
    const year = (await tx.queryOne<{ school_year_id: number }>("SELECT school_year_id FROM classes WHERE id = ?", [classId]))!.school_year_id;
    await enrollMany(tx, plan.moves.map((m) => ({ studentId: m.id, classId, schoolYearId: year })));
    await audit({ userId: actor.id, action: "class.students_move", entityType: "class", entityId: classId, newValues: { count: plan.moves.length, studentIds: plan.moves.map((m) => m.id).slice(0, 1000) }, req }, tx);
    return plan;
  });
}

// ------------------------------------------------------------------ CSV import

export type ImportStatus = "create" | "move" | "unchanged" | "error";

export interface ImportResultRow {
  line: number;
  status: ImportStatus;
  studentCode: string;
  name: string;
  className: string | null;
  fromClass: string | null;
  message?: string;
}

export interface ImportReport {
  rows: ImportResultRow[];
  summary: Record<ImportStatus, number>;
  applied: boolean;
}

/**
 * CSV importu. Sətirlər bir neçə toplu sorğu ilə yoxlanılır (sətir başına sorğu yoxdur), sonra
 * apply=true olduqda hamısı BİR tranzaksiyada, partiyalarla yazılır. Xətalı sətir varsa heç nə yazılmır.
 *  - student_id (student_code) mövcuddursa → şagird təkrar yaradılmır, yalnız sinfi dəyişir;
 *  - yoxdursa → ad və soyad ilə yeni şagird profili (hesabsız) yaradılır;
 *  - sinif yalnız mövcud sinif kodu (və ya aktiv ildəki sinif adı) ilə müəyyən edilir.
 */
export async function importStudents(actor: CurrentUser, csvText: string, apply: boolean, req?: NextRequest): Promise<ImportReport> {
  const mapped = mapImportRows(parseCsv(csvText));
  if (mapped.error) throw Errors.badRequest(mapped.error);
  if (!mapped.rows.length) throw Errors.badRequest("Faylda başlıqdan sonra sətir yoxdur.");
  if (mapped.rows.length > MAX_IMPORT_ROWS) throw Errors.badRequest(`Bir dəfəyə ən çox ${MAX_IMPORT_ROWS} sətir import etmək olar.`);

  return transaction(async (tx) => {
    const year = await activeSchoolYear(tx);
    const codes = [...new Set(mapped.rows.map((r) => normalizeClassCode(r.classCode)).filter(Boolean))];
    const names = [...new Set(mapped.rows.filter((r) => !r.classCode && r.className).map((r) => r.className.toLowerCase()))];
    const byCode = new Map<string, { id: number; name: string; school_year_id: number; is_active: number }>();
    if (codes.length) {
      for (const c of await tx.query<{ code_norm: string; id: number; name: string; school_year_id: number; is_active: number }>(
        `SELECT k.code_norm, c.id, c.name, c.school_year_id, c.is_active FROM class_invite_codes k JOIN classes c ON c.id = k.class_id
          WHERE k.code_norm IN (?) AND k.revoked_at IS NULL`,
        [codes]
      )) byCode.set(c.code_norm, c);
    }
    const byName = new Map<string, { id: number; name: string; school_year_id: number; is_active: number }>();
    if (names.length && year) {
      for (const c of await tx.query<{ id: number; name: string; school_year_id: number; is_active: number }>(
        "SELECT id, name, school_year_id, is_active FROM classes WHERE school_year_id = ? AND lower(name) IN (?)",
        [year.id, names]
      )) byName.set(c.name.toLowerCase(), c);
    }
    const studentCodes = [...new Set(mapped.rows.map((r) => r.studentCode).filter(Boolean))];
    const existing = new Map<string, { id: number; first_name: string; last_name: string; class_id: number | null; class_name: string | null; deleted_at: string | null }>();
    for (let i = 0; i < studentCodes.length; i += BATCH) {
      for (const s of await tx.query<{ id: number; student_code: string; first_name: string; last_name: string; class_id: number | null; class_name: string | null; deleted_at: string | null }>(
        `SELECT s.id, s.student_code, s.first_name, s.last_name, s.class_id, c.name AS class_name, s.deleted_at
           FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.student_code IN (?)`,
        [studentCodes.slice(i, i + BATCH)]
      )) existing.set(s.student_code, s);
    }

    const seenCodes = new Set<string>();
    const seenNew = new Set<string>();
    const out: ImportResultRow[] = [];
    const byLine = new Map<number, ImportResultRow>();
    const toMove: { studentId: number; classId: number; schoolYearId: number }[] = [];
    const toCreate: { row: ImportRow; classId: number; schoolYearId: number }[] = [];

    for (const r of mapped.rows) {
      const name = [r.lastName, r.firstName].filter(Boolean).join(" ");
      const res: ImportResultRow = { line: r.line, status: "error", studentCode: r.studentCode, name, className: null, fromClass: null };
      out.push(res);
      byLine.set(r.line, res);
      const cls = r.classCode ? byCode.get(normalizeClassCode(r.classCode)) : r.className ? byName.get(r.className.toLowerCase()) : undefined;
      if (!r.classCode && !r.className) { res.message = "Sinif kodu boşdur."; continue; }
      if (!cls) { res.message = r.classCode ? "Sinif kodu tapılmadı." : "Aktiv tədris ilində belə sinif yoxdur."; continue; }
      if (!cls.is_active) { res.message = "Sinif deaktivdir."; continue; }
      res.className = cls.name;
      if (r.studentCode) {
        if (seenCodes.has(r.studentCode)) { res.message = "Təkrar sətir: bu şagird kodu faylda artıq var."; continue; }
        seenCodes.add(r.studentCode);
        if (r.studentCode.length > 30) { res.message = "Şagird kodu 30 simvoldan uzundur."; continue; }
      }
      const ex = r.studentCode ? existing.get(r.studentCode) : undefined;
      if (ex) {
        if (ex.deleted_at) { res.message = "Bu şagird qeydi silinib."; continue; }
        res.name = `${ex.last_name} ${ex.first_name}`;
        res.fromClass = ex.class_name;
        if (ex.class_id === cls.id) { res.status = "unchanged"; continue; }
        res.status = "move";
        toMove.push({ studentId: ex.id, classId: cls.id, schoolYearId: cls.school_year_id });
        continue;
      }
      if (!r.firstName || !r.lastName) { res.message = "Yeni şagird üçün ad və soyad tələb olunur."; continue; }
      if (r.firstName.length > 100 || r.lastName.length > 100) { res.message = "Ad və ya soyad 100 simvoldan uzundur."; continue; }
      const key = `${r.lastName.toLowerCase()}|${r.firstName.toLowerCase()}|${cls.id}`;
      if (!r.studentCode && seenNew.has(key)) { res.message = "Təkrar sətir: eyni sinifdə eyni ad və soyad."; continue; }
      seenNew.add(key);
      res.status = "create";
      toCreate.push({ row: r, classId: cls.id, schoolYearId: cls.school_year_id });
    }

    // Kodsuz yeni şagirdlər üçün: bazada eyni sinifdə eyni adlı şagird varsa — ehtimal olunan təkrar
    const nameless = toCreate.filter((c) => !c.row.studentCode);
    if (nameless.length) {
      const dupes = await tx.query<{ k: string }>(
        `SELECT lower(last_name) || '|' || lower(first_name) || '|' || class_id AS k FROM students
          WHERE deleted_at IS NULL AND class_id IN (?) AND (lower(last_name), lower(first_name)) IN (SELECT * FROM (VALUES ?) AS v(l, f))`,
        [[...new Set(nameless.map((c) => c.classId))], nameless.map((c) => [c.row.lastName.toLowerCase(), c.row.firstName.toLowerCase()])]
      );
      const dupeSet = new Set(dupes.map((d) => d.k));
      for (const c of nameless) {
        if (dupeSet.has(`${c.row.lastName.toLowerCase()}|${c.row.firstName.toLowerCase()}|${c.classId}`)) {
          const res = byLine.get(c.row.line)!;
          res.status = "error";
          res.message = "Ehtimal olunan təkrar: bu sinifdə eyni ad və soyadlı şagird var. student_id sütununu doldurun.";
        }
      }
    }

    const summary = { create: 0, move: 0, unchanged: 0, error: 0 } as Record<ImportStatus, number>;
    for (const o of out) summary[o.status]++;
    if (!apply || summary.error > 0) return { rows: out, summary, applied: false };

    const creates = toCreate.filter((c) => byLine.get(c.row.line)!.status === "create");
    for (let i = 0; i < creates.length; i += BATCH) {
      const chunk = creates.slice(i, i + BATCH).map((c) => ({ ...c, code: c.row.studentCode || newStudentCode() }));
      const inserted = await tx.query<{ id: number; class_id: number; school_year_id: number }>(
        "INSERT INTO students (student_code, first_name, last_name, class_id, school_year_id) VALUES ? RETURNING id, class_id, school_year_id",
        [chunk.map((c) => [c.code, c.row.firstName, c.row.lastName, c.classId, c.schoolYearId])]
      );
      await tx.execute(
        "INSERT INTO class_students (class_id, student_id, school_year_id) VALUES ? ON CONFLICT DO NOTHING",
        [inserted.map((s) => [s.class_id, s.id, s.school_year_id])]
      );
    }
    await enrollMany(tx, toMove);
    await audit({ userId: actor.id, action: "class.students_import", entityType: "student", newValues: { created: summary.create, moved: summary.move, unchanged: summary.unchanged, rows: out.length }, req }, tx);
    return { rows: out, summary, applied: true };
  });
}
