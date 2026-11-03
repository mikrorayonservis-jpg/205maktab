/**
 * Konfiqurasiya əsaslı ümumi CRUD mühərriki (admin CMS).
 * Validasiya sahə təriflərindən qurulur; SQL identifikatorları yalnız konfiqurasiyadan gəlir.
 */
import "server-only";
import type { NextRequest } from "next/server";
import { db, transaction, type Db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { Errors } from "@/lib/http";
import type { CurrentUser } from "@/lib/auth/session";
import { slugify } from "@/lib/slug";
import { z, isoDate, time as timeSchema } from "@/lib/validation";
import type { FieldDef, ResourceDef } from "@/config/admin-resources";
import { notifyRoles } from "./notifications";

const IDENT = /^[a-z_][a-z0-9_]*$/;
function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Yanlış identifikator: ${name}`);
  return `\`${name}\``;
}

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

function fieldSchema(f: FieldDef): z.ZodTypeAny {
  let s: z.ZodTypeAny;
  switch (f.type) {
    case "number":
      s = z.coerce.number().int().min(f.min ?? -2147483648).max(f.max ?? 2147483647);
      break;
    case "boolean":
      return z.preprocess((v) => v === true || v === 1 || v === "1" || v === "true", z.boolean()).transform((b) => (b ? 1 : 0));
    case "date":
      s = isoDate;
      break;
    case "datetime":
      s = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/, "Tarix və saat düzgün deyil.")
        .transform((v) => `${v.replace("T", " ").slice(0, 16)}:00`);
      break;
    case "time":
      s = timeSchema;
      break;
    case "email":
      s = z.string().trim().toLowerCase().email().max(f.max ?? 190);
      break;
    case "url":
      s = z.string().trim().url().max(f.max ?? 500).refine((u) => /^https?:\/\//i.test(u), "Yalnız http(s) keçidlərinə icazə verilir.");
      break;
    case "image":
    case "file":
      s = z.string().regex(/^\/media\/[A-Za-z0-9/_\-.]+$/, "Faylı yükləmə düyməsi ilə əlavə edin.");
      break;
    case "select":
      if (f.options) {
        const values = f.options.map((o) => o.value) as [string, ...string[]];
        s = z.coerce.string().pipe(z.enum(values));
      } else {
        s = z.coerce.number().int().positive();
      }
      break;
    default:
      s = z.string().trim().max(f.max ?? 255);
      if (f.required) s = (s as z.ZodString).min(1);
  }
  const pre = (v: unknown) => (v === "" || v === undefined ? (f.default !== undefined ? f.default : null) : v);
  return f.required ? z.preprocess(pre, s) : z.preprocess(pre, s.nullable());
}

export function buildSchema(def: ResourceDef, partial = false) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of def.fields) {
    if (f.readOnly) continue;
    shape[f.name] = partial ? fieldSchema(f).optional() : fieldSchema(f);
  }
  return z.object(shape).strict();
}

function editableFields(def: ResourceDef) {
  return def.fields.filter((f) => !f.readOnly);
}

export interface ListParams {
  q?: string;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  filters: Record<string, string>;
}

function whereClause(def: ResourceDef, p: Pick<ListParams, "q" | "filters">) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (def.softDelete) where.push("deleted_at IS NULL");
  if (p.q && def.search.length) {
    const like = `%${p.q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(`(${def.search.map((c) => `${ident(c)} LIKE ?`).join(" OR ")})`);
    def.search.forEach(() => params.push(like));
  }
  for (const [k, v] of Object.entries(p.filters)) {
    if (!def.filters?.includes(k) || v === "") continue;
    where.push(`${ident(k)} = ?`);
    params.push(v);
  }
  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

function selectColumns(def: ResourceDef) {
  return ["id", ...def.fields.map((f) => f.name)].map(ident).join(", ");
}

export async function listResource(def: ResourceDef, p: ListParams) {
  const w = whereClause(def, p);
  const sortField = p.sort && def.fields.some((f) => f.name === p.sort) ? `${ident(p.sort)} ${p.dir === "desc" ? "DESC" : "ASC"}, id DESC` : def.orderBy;
  const total = await db.queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ${ident(def.table)} ${w.sql}`, w.params);
  const rows = await db.query(
    `SELECT ${selectColumns(def)} FROM ${ident(def.table)} ${w.sql} ORDER BY ${sortField} LIMIT ? OFFSET ?`,
    [...w.params, p.pageSize, (p.page - 1) * p.pageSize]
  );
  return { rows, total: Number(total?.n || 0), page: p.page, pageSize: p.pageSize };
}

export async function exportResource(def: ResourceDef, p: Pick<ListParams, "q" | "filters">) {
  const w = whereClause(def, p);
  return db.query(`SELECT ${selectColumns(def)} FROM ${ident(def.table)} ${w.sql} ORDER BY ${def.orderBy} LIMIT 20000`, w.params);
}

export async function getResourceRow(def: ResourceDef, id: number, tx: Db = db) {
  const row = await tx.queryOne(`SELECT ${selectColumns(def)} FROM ${ident(def.table)} WHERE id = ?${def.softDelete ? " AND deleted_at IS NULL" : ""}`, [id]);
  if (!row) throw Errors.notFound(def.singular);
  return row;
}

async function uniqueSlug(tx: Db, def: ResourceDef, base: string, excludeId: number) {
  let slug = slugify(base, 100);
  const root = slug;
  for (let i = 2; i < 200; i++) {
    const exists = await tx.queryOne(`SELECT id FROM ${ident(def.table)} WHERE slug = ? AND id <> ?`, [slug, excludeId]);
    if (!exists) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

/** Resursa xas biznes qaydaları. */
async function beforeSave(def: ResourceDef, data: Record<string, unknown>, tx: Db, id: number | null) {
  if (def.key === "galleries") {
    if (data.is_published && data.contains_minors && !data.consent_confirmed) {
      throw Errors.badRequest("Şagirdlərin təsviri olan albom valideyn razılığı təsdiqlənmədən dərc edilə bilməz.", { consent_confirmed: "Razılığı təsdiqləyin." });
    }
  }
  if (def.key === "school-years" && data.start_date && data.end_date && String(data.start_date) >= String(data.end_date)) {
    throw Errors.badRequest("Bitmə tarixi başlama tarixindən sonra olmalıdır.", { end_date: "Tarixi yoxlayın." });
  }
  if (def.key === "events" && data.end_datetime && data.start_datetime && String(data.end_datetime) < String(data.start_datetime)) {
    throw Errors.badRequest("Bitmə vaxtı başlama vaxtından əvvəl ola bilməz.", { end_datetime: "Vaxtı yoxlayın." });
  }
  if (def.key === "bell-times" && data.start_time && data.end_time && String(data.start_time) >= String(data.end_time)) {
    throw Errors.badRequest("Bitmə vaxtı başlama vaxtından sonra olmalıdır.", { end_time: "Vaxtı yoxlayın." });
  }
  if (def.key === "documents" && typeof data.file_url === "string") {
    const key = `public/${data.file_url.replace(/^\/media\//, "")}`;
    const f = await tx.queryOne<{ id: number; mime_type: string; size_bytes: number }>("SELECT id, mime_type, size_bytes FROM files WHERE storage_key = ?", [key]);
    if (!f) throw Errors.badRequest("Fayl tapılmadı. Yenidən yükləyin.", { file_url: "Fayl tapılmadı." });
    if (f.mime_type !== "application/pdf") throw Errors.badRequest("Sənəd PDF formatında olmalıdır.", { file_url: "Yalnız PDF." });
    data.file_id = f.id;
    data.file_type = f.mime_type;
    data.file_size = f.size_bytes;
  }
  if (def.key === "classes" && data.class_teacher_id) {
    const t = await tx.queryOne("SELECT id FROM teachers WHERE id = ? AND deleted_at IS NULL", [data.class_teacher_id]);
    if (!t) throw Errors.badRequest("Müəllim tapılmadı.", { class_teacher_id: "Müəllim tapılmadı." });
  }
  void id;
}

async function afterSave(def: ResourceDef, id: number, data: Record<string, unknown>, tx: Db, user: CurrentUser, isNew: boolean, old?: Record<string, unknown>) {
  if (def.key === "school-years" && data.is_active) {
    await tx.execute("UPDATE school_years SET is_active = 0 WHERE id <> ?", [id]);
  }
  if (def.key === "students" && data.class_id && (isNew || Number(old?.class_id) !== Number(data.class_id))) {
    const year = await tx.queryOne<{ school_year_id: number }>("SELECT school_year_id FROM classes WHERE id = ?", [data.class_id]);
    if (year) {
      await tx.execute("UPDATE students SET school_year_id = ? WHERE id = ?", [year.school_year_id, id]);
      await tx.execute("INSERT IGNORE INTO class_students (class_id, student_id, school_year_id) VALUES (?, ?, ?)", [data.class_id, id, year.school_year_id]);
    }
  }
  if (def.key === "classes" && data.class_teacher_id) {
    const t = await tx.queryOne<{ user_id: number | null }>("SELECT user_id FROM teachers WHERE id = ?", [data.class_teacher_id]);
    if (t?.user_id) await tx.execute("INSERT IGNORE INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE code = 'class_teacher'", [t.user_id]);
  }
  void user;
}

export async function createResource(def: ResourceDef, input: unknown, user: CurrentUser, req?: NextRequest) {
  const data = buildSchema(def).parse(input) as Record<string, unknown>;
  const result = await transaction(async (tx) => {
    if (def.slugFrom) data.slug = await uniqueSlug(tx, def, String(data.slug || data[def.slugFrom] || ""), 0);
    await beforeSave(def, data, tx, null);
    if (def.createdByColumn) data[def.createdByColumn] = user.id;
    const cols = Object.keys(data);
    const res = await tx.execute(
      `INSERT INTO ${ident(def.table)} (${cols.map(ident).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      cols.map((c) => data[c])
    );
    await afterSave(def, res.insertId, data, tx, user, true);
    await audit({ userId: user.id, action: `${def.key}.create`, entityType: def.table, entityId: res.insertId, newValues: data, req }, tx);
    return { id: res.insertId };
  });
  if (def.key === "events" && data.is_published) {
    await notifyRoles("all", { title: "Yeni tədbir elan edildi", message: String(data.title_az), type: "event", link: `/events/${data.slug}`, entityType: "event", entityId: result.id });
  }
  return result;
}

export async function updateResource(def: ResourceDef, id: number, input: unknown, user: CurrentUser, req?: NextRequest) {
  const patch = buildSchema(def, true).parse(input) as Record<string, unknown>;
  return transaction(async (tx) => {
    const old = (await getResourceRow(def, id, tx)) as Record<string, unknown>;
    const merged = { ...old, ...patch };
    if (def.slugFrom && ("slug" in patch || def.slugFrom in patch)) {
      patch.slug = await uniqueSlug(tx, def, String(patch.slug || merged.slug || merged[def.slugFrom] || ""), id);
    }
    await beforeSave(def, merged, tx, id);
    for (const k of ["file_id", "file_type", "file_size"]) if (k in merged && def.key === "documents") patch[k] = merged[k];
    const cols = Object.keys(patch);
    if (cols.length) {
      await tx.execute(`UPDATE ${ident(def.table)} SET ${cols.map((c) => `${ident(c)} = ?`).join(", ")} WHERE id = ?`, [...cols.map((c) => patch[c]), id]);
    }
    await afterSave(def, id, merged, tx, user, false, old);
    await audit({ userId: user.id, action: `${def.key}.update`, entityType: def.table, entityId: id, oldValues: old, newValues: patch, req }, tx);
    return { id };
  });
}

export async function deleteResources(def: ResourceDef, ids: number[], user: CurrentUser, req?: NextRequest) {
  return transaction(async (tx) => {
    for (const id of ids) {
      const old = await getResourceRow(def, id, tx);
      if (def.softDelete) await tx.execute(`UPDATE ${ident(def.table)} SET deleted_at = NOW() WHERE id = ?`, [id]);
      else await tx.execute(`DELETE FROM ${ident(def.table)} WHERE id = ?`, [id]);
      await audit({ userId: user.id, action: `${def.key}.delete`, entityType: def.table, entityId: id, oldValues: old, req }, tx);
    }
    return { deleted: ids.length };
  });
}

export function toCsv(def: ResourceDef, rows: Record<string, unknown>[]): string {
  const fields = def.fields.filter((f) => !f.private);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // CSV formula injection-a qarşı
    return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const header = ["ID", ...fields.map((f) => f.label)].map(esc).join(";");
  const lines = rows.map((r) => [r.id, ...fields.map((f) => r[f.name])].map(esc).join(";"));
  return "﻿" + [header, ...lines].join("\r\n");
}

export function editableFieldNames(def: ResourceDef) {
  return editableFields(def).map((f) => f.name);
}
