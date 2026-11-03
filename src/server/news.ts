/**
 * Xəbər redaksiyası: məqalə yaratma, redaktə, iş axını (draft → pending → approved → published → archived),
 * reviziya tarixçəsi və ictimai sorğular.
 */
import "server-only";
import type { NextRequest } from "next/server";
import { cache } from "react";
import { db, transaction, type Db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError, Errors } from "@/lib/http";
import { can } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import { slugify } from "@/lib/slug";
import { z, optionalId, optionalText, shortText } from "@/lib/validation";
import { notifyRoles, notifyUsers } from "./notifications";

export const NEWS_STATUS = {
  draft: "Qaralama",
  pending: "Yoxlamada",
  approved: "Təsdiqlənib",
  published: "Dərc edilib",
  archived: "Arxivdə",
} as const;
export type NewsStatus = keyof typeof NEWS_STATUS;

export const articleSchema = z.object({
  title: shortText(300),
  summary: optionalText(600),
  content: z.string().trim().min(20, "Mətn ən azı 20 simvol olmalıdır.").max(100000),
  categoryId: optionalId,
  coverImage: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\/media\/[A-Za-z0-9/_\-.]+$/, "Örtük şəkli yüklənmiş fayl olmalıdır.").nullable().optional()),
  coverAlt: optionalText(255),
  byline: optionalText(200),
  seoTitle: optionalText(300),
  seoDescription: optionalText(320),
  containsMinors: z.boolean().default(false),
  consentConfirmed: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  galleryId: optionalId,
});
export type ArticleInput = z.infer<typeof articleSchema>;

export const transitionSchema = z.object({
  action: z.enum(["submit", "request_changes", "approve", "reject", "publish", "unpublish", "restore"]),
  note: optionalText(2000),
});
export type TransitionAction = z.infer<typeof transitionSchema>["action"];

interface NewsRow {
  id: number;
  title_az: string;
  slug: string;
  summary_az: string | null;
  content_az: string;
  status: NewsStatus;
  created_by: number;
  contains_minors: number;
  consent_confirmed: number;
  published_at: string | null;
}

async function uniqueSlug(tx: Db, title: string, excludeId?: number): Promise<string> {
  const base = slugify(title, 100);
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const exists = await tx.queryOne("SELECT id FROM news WHERE slug = ? AND id <> ?", [slug, excludeId ?? 0]);
    if (!exists) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

async function load(id: number, tx: Db = db): Promise<NewsRow> {
  const row = await tx.queryOne<NewsRow>(
    "SELECT id, title_az, slug, summary_az, content_az, status, created_by, contains_minors, consent_confirmed, published_at FROM news WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
  if (!row) throw Errors.notFound("Məqalə");
  return row;
}

export function canEditArticle(user: CurrentUser, a: { created_by: number; status: NewsStatus }): boolean {
  if (can(user, "news.edit_any")) return true;
  return a.created_by === user.id && a.status === "draft" && can(user, "news.submit");
}

export function canViewArticleAdmin(user: CurrentUser, a: { created_by: number }): boolean {
  return a.created_by === user.id || can(user, "news.edit_any") || can(user, "news.review") || can(user, "news.publish");
}

function sanitizeFlags(user: CurrentUser, input: ArticleInput) {
  return {
    isFeatured: can(user, "news.publish") ? input.isFeatured : false,
    consentConfirmed: can(user, "news.review") || can(user, "news.publish") ? input.consentConfirmed : false,
  };
}

export async function createArticle(user: CurrentUser, input: ArticleInput, req?: NextRequest) {
  if (!can(user, "news.submit")) throw Errors.forbidden();
  const flags = sanitizeFlags(user, input);
  return transaction(async (tx) => {
    const slug = await uniqueSlug(tx, input.title);
    const res = await tx.execute(
      `INSERT INTO news (title_az, slug, summary_az, content_az, cover_image, cover_alt_az, category_id, byline_az, created_by, status,
                         seo_title_az, seo_description_az, contains_minors, consent_confirmed, is_featured, gallery_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      [input.title, slug, input.summary ?? null, input.content, input.coverImage ?? null, input.coverAlt ?? null, input.categoryId, input.byline ?? null,
        user.id, input.seoTitle ?? null, input.seoDescription ?? null, input.containsMinors ? 1 : 0, flags.consentConfirmed ? 1 : 0, flags.isFeatured ? 1 : 0, input.galleryId]
    );
    await tx.execute(
      "INSERT INTO news_revisions (news_id, action, status_to, title_az, content_az, summary_az, changed_by) VALUES (?, 'create', 'draft', ?, ?, ?, ?)",
      [res.insertId, input.title, input.content, input.summary ?? null, user.id]
    );
    await audit({ userId: user.id, action: "news.create", entityType: "news", entityId: res.insertId, newValues: { title: input.title }, req }, tx);
    return { id: res.insertId, slug };
  });
}

export async function updateArticle(user: CurrentUser, id: number, input: ArticleInput, req?: NextRequest) {
  return transaction(async (tx) => {
    const old = await load(id, tx);
    if (!canEditArticle(user, old)) throw Errors.forbidden();
    const flags = sanitizeFlags(user, input);
    const current = await tx.queryOne<{ is_featured: number; consent_confirmed: number }>("SELECT is_featured, consent_confirmed FROM news WHERE id = ?", [id]);
    const isFeatured = can(user, "news.publish") ? flags.isFeatured : Boolean(current?.is_featured);
    const consent = can(user, "news.review") || can(user, "news.publish") ? flags.consentConfirmed : Boolean(current?.consent_confirmed);
    if (old.status === "published" && input.containsMinors && !consent) {
      throw Errors.badRequest("Dərc edilmiş məqalədə yetkinlik yaşına çatmayanların təsviri varsa, razılıq təsdiqlənməlidir.");
    }
    const slug = old.status === "published" ? old.slug : await uniqueSlug(tx, input.title, id);
    await tx.execute(
      `UPDATE news SET title_az = ?, slug = ?, summary_az = ?, content_az = ?, cover_image = ?, cover_alt_az = ?, category_id = ?, byline_az = ?,
              seo_title_az = ?, seo_description_az = ?, contains_minors = ?, consent_confirmed = ?, is_featured = ?, gallery_id = ? WHERE id = ?`,
      [input.title, slug, input.summary ?? null, input.content, input.coverImage ?? null, input.coverAlt ?? null, input.categoryId, input.byline ?? null,
        input.seoTitle ?? null, input.seoDescription ?? null, input.containsMinors ? 1 : 0, consent ? 1 : 0, isFeatured ? 1 : 0, input.galleryId, id]
    );
    await tx.execute(
      "INSERT INTO news_revisions (news_id, action, status_from, status_to, title_az, content_az, summary_az, changed_by) VALUES (?, 'edit', ?, ?, ?, ?, ?, ?)",
      [id, old.status, old.status, input.title, input.content, input.summary ?? null, user.id]
    );
    await audit({ userId: user.id, action: "news.update", entityType: "news", entityId: id, oldValues: { title: old.title_az, status: old.status }, newValues: { title: input.title }, req }, tx);
    return { id, slug };
  });
}

const TRANSITIONS: Record<TransitionAction, { from: NewsStatus[]; to: NewsStatus; check: (u: CurrentUser, a: NewsRow) => boolean }> = {
  submit: { from: ["draft"], to: "pending", check: (u, a) => a.created_by === u.id || can(u, "news.edit_any") },
  request_changes: { from: ["pending", "approved"], to: "draft", check: (u) => can(u, "news.review") },
  approve: { from: ["pending"], to: "approved", check: (u) => can(u, "news.review") },
  reject: { from: ["pending", "approved"], to: "archived", check: (u) => can(u, "news.review") },
  publish: { from: ["approved"], to: "published", check: (u) => can(u, "news.publish") },
  unpublish: { from: ["published"], to: "archived", check: (u) => can(u, "news.publish") },
  restore: { from: ["archived"], to: "draft", check: (u) => can(u, "news.edit_any") },
};

const ACTION_TEXT: Record<TransitionAction, string> = {
  submit: "yoxlamaya göndərildi",
  request_changes: "üçün düzəliş istənildi",
  approve: "təsdiqləndi",
  reject: "rədd edildi",
  publish: "dərc edildi",
  unpublish: "dərcdən çıxarıldı",
  restore: "qaralamaya qaytarıldı",
};

export async function transitionArticle(user: CurrentUser, id: number, action: TransitionAction, note: string | null | undefined, req?: NextRequest) {
  const t = TRANSITIONS[action];
  const result = await transaction(async (tx) => {
    const a = await load(id, tx);
    if (!t.check(user, a)) throw Errors.forbidden();
    if (!t.from.includes(a.status)) throw new AppError(409, "INVALID_STATE", `Məqalə "${NEWS_STATUS[a.status]}" vəziyyətindədir; bu əməliyyat mümkün deyil.`);
    if ((action === "request_changes" || action === "reject") && !note) throw Errors.badRequest("Səbəbi qeyd edin.", { note: "Qeyd tələb olunur." });
    if (action === "publish" && a.contains_minors && !a.consent_confirmed) {
      throw Errors.badRequest("Məqalədə yetkinlik yaşına çatmayan şagirdlərin foto/adları var. Dərcdən əvvəl valideyn razılığını təsdiqləyin.");
    }
    const sets = ["status = ?"];
    const params: unknown[] = [t.to];
    if (action === "submit") sets.push("submitted_at = NOW()");
    if (action === "approve") { sets.push("approved_by = ?"); params.push(user.id); }
    if (action === "publish") { sets.push("published_by = ?", "published_at = COALESCE(published_at, NOW())"); params.push(user.id); }
    if (note !== undefined) { sets.push("review_note = ?"); params.push(note ?? null); }
    params.push(id);
    await tx.execute(`UPDATE news SET ${sets.join(", ")} WHERE id = ?`, params);
    await tx.execute(
      "INSERT INTO news_revisions (news_id, action, status_from, status_to, change_reason, changed_by) VALUES (?, ?, ?, ?, ?, ?)",
      [id, action, a.status, t.to, note ?? null, user.id]
    );
    await audit({ userId: user.id, action: `news.${action}`, entityType: "news", entityId: id, oldValues: { status: a.status }, newValues: { status: t.to, note }, req }, tx);
    return a;
  });

  if (result.created_by !== user.id) {
    await notifyUsers([result.created_by], {
      title: `Məqaləniz ${ACTION_TEXT[action]}`,
      message: note ? `${result.title_az}\n${note}` : result.title_az,
      type: "editorial",
      link: `/editorial/${id}`,
      entityType: "news",
      entityId: id,
    });
  }
  if (action === "submit") {
    await notifyRoles(["editor", "chief_editor"], { title: "Yeni məqalə yoxlama gözləyir", message: result.title_az, type: "editorial", link: `/editorial/${id}`, entityType: "news", entityId: id });
  }
  if (action === "publish") {
    await notifyRoles("all", { title: "Yeni məktəb xəbəri yayımlandı", message: result.title_az, type: "news", link: `/news/${result.slug}`, entityType: "news", entityId: id });
  }
  return { status: t.to };
}

export async function deleteArticle(user: CurrentUser, id: number, req?: NextRequest) {
  const a = await load(id);
  const allowed = can(user, "news.edit_any") || (a.created_by === user.id && a.status === "draft");
  if (!allowed) throw Errors.forbidden();
  if (a.status === "published" && !can(user, "news.publish")) throw Errors.forbidden();
  await db.execute("UPDATE news SET deleted_at = NOW() WHERE id = ?", [id]);
  await audit({ userId: user.id, action: "news.delete", entityType: "news", entityId: id, oldValues: { title: a.title_az, status: a.status }, req });
}

export async function editorialList(user: CurrentUser, q: { scope: "mine" | "queue" | "all"; status?: NewsStatus; search?: string; page: number }) {
  const where = ["n.deleted_at IS NULL"];
  const params: unknown[] = [];
  if (q.scope === "mine" || !(can(user, "news.edit_any") || can(user, "news.review") || can(user, "news.publish"))) {
    where.push("n.created_by = ?");
    params.push(user.id);
  } else if (q.scope === "queue") {
    where.push(can(user, "news.publish") ? "n.status IN ('pending','approved')" : "n.status = 'pending'");
  }
  if (q.status) { where.push("n.status = ?"); params.push(q.status); }
  if (q.search) { where.push("n.title_az ILIKE ?"); params.push(`%${q.search.replace(/[%_]/g, "\\$&")}%`); }
  const total = await db.queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM news n WHERE ${where.join(" AND ")}`, params);
  const rows = await db.query(
    `SELECT n.id, n.title_az, n.slug, n.status, n.updated_at, n.published_at, n.submitted_at, n.contains_minors, n.consent_confirmed,
            c.name_az AS category_name, CONCAT_WS(' ', u.first_name, u.last_name) AS author_name, u.email AS author_email
       FROM news n LEFT JOIN news_categories c ON c.id = n.category_id JOIN users u ON u.id = n.created_by
      WHERE ${where.join(" AND ")}
      ORDER BY n.updated_at DESC LIMIT 20 OFFSET ?`,
    [...params, (q.page - 1) * 20]
  );
  return { rows, total: Number(total?.n || 0), pageSize: 20 };
}

export async function editorialGet(user: CurrentUser, id: number) {
  const a = await db.queryOne(
    `SELECT n.*, CONCAT_WS(' ', u.first_name, u.last_name) AS author_name FROM news n JOIN users u ON u.id = n.created_by WHERE n.id = ? AND n.deleted_at IS NULL`,
    [id]
  );
  if (!a || !canViewArticleAdmin(user, a)) throw Errors.notFound("Məqalə");
  const history = await db.query(
    `SELECT r.id, r.action, r.status_from, r.status_to, r.change_reason, r.created_at, CONCAT_WS(' ', u.first_name, u.last_name) AS user_name, u.email
       FROM news_revisions r JOIN users u ON u.id = r.changed_by WHERE r.news_id = ? ORDER BY r.id DESC LIMIT 100`,
    [id]
  );
  return { article: a, history, canEdit: canEditArticle(user, a) };
}

/* ───────────── İctimai sorğular ───────────── */

export interface PublicNews {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  cover_image: string | null;
  cover_alt: string | null;
  published_at: string;
  category_name: string | null;
  category_slug: string | null;
  is_featured: number;
}

const PUBLIC_COLS = `n.id, n.title_az AS title, n.slug, n.summary_az AS summary, n.cover_image, n.cover_alt_az AS cover_alt, n.published_at,
                     c.name_az AS category_name, c.slug AS category_slug, n.is_featured`;
const PUBLIC_WHERE = "n.status = 'published' AND n.deleted_at IS NULL AND n.published_at <= NOW() AND (n.contains_minors = 0 OR n.consent_confirmed = 1)";

export async function publishedNews(opts: { category?: string; q?: string; page?: number; pageSize?: number; excludeId?: number } = {}) {
  const where = [PUBLIC_WHERE];
  const params: unknown[] = [];
  if (opts.category) { where.push("c.slug = ?"); params.push(opts.category); }
  if (opts.q) { where.push("(n.title_az ILIKE ? OR n.summary_az ILIKE ?)"); const like = `%${opts.q.replace(/[%_]/g, "\\$&")}%`; params.push(like, like); }
  if (opts.excludeId) { where.push("n.id <> ?"); params.push(opts.excludeId); }
  const pageSize = opts.pageSize ?? 12;
  const page = Math.max(1, opts.page ?? 1);
  const total = await db.queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM news n LEFT JOIN news_categories c ON c.id = n.category_id WHERE ${where.join(" AND ")}`, params);
  const rows = await db.query<PublicNews>(
    `SELECT ${PUBLIC_COLS} FROM news n LEFT JOIN news_categories c ON c.id = n.category_id
      WHERE ${where.join(" AND ")} ORDER BY n.published_at DESC, n.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  return { rows, total: Number(total?.n || 0), page, pageSize };
}

export const publishedArticle = cache(async (slug: string) => {
  return db.queryOne(
    `SELECT n.id, n.title_az AS title, n.slug, n.summary_az AS summary, n.content_az AS content, n.cover_image, n.cover_alt_az AS cover_alt,
            n.published_at, n.updated_at, n.views, n.seo_title_az AS seo_title, n.seo_description_az AS seo_description, n.gallery_id,
            COALESCE(n.byline_az, CONCAT_WS(' ', u.first_name, u.last_name)) AS byline, c.name_az AS category_name, c.slug AS category_slug
       FROM news n LEFT JOIN news_categories c ON c.id = n.category_id JOIN users u ON u.id = n.created_by
      WHERE n.slug = ? AND ${PUBLIC_WHERE}`,
    [slug]
  );
});

export async function incrementViews(id: number) {
  await db.execute("UPDATE news SET views = views + 1 WHERE id = ?", [id]);
}

export const newsCategories = cache(async () => {
  return db.query<{ id: number; name_az: string; slug: string }>("SELECT id, name_az, slug FROM news_categories ORDER BY name_az");
});
