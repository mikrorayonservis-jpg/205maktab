/** İctimai sayt üçün oxuma sorğuları. Yalnız dərc edilmiş və ictimai sahələr qaytarılır. */
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const DOCUMENT_CATEGORIES: Record<string, string> = {
  nizamname: "Məktəbin nizamnaməsi",
  tedris_plani: "Tədris planları",
  daxili_qaydalar: "Daxili qaydalar",
  esasnameler: "Əsasnamələr",
  standartlar: "Təhsil standartları",
  illik_plan: "İllik fəaliyyət planı",
  hesabatlar: "Hesabatlar",
  elan_serencam: "Rəsmi elan və sərəncamlar",
};

export const EVENT_STATUS: Record<string, string> = {
  planned: "Planlaşdırılıb",
  ongoing: "Davam edir",
  completed: "Keçirilib",
  cancelled: "Ləğv edilib",
};

export interface PublicTeacher {
  id: number;
  first_name: string;
  last_name: string;
  subject: string | null;
  position_az: string | null;
  education_az: string | null;
  qualification: string | null;
  experience_years: number | null;
  bio: string | null;
  avatar_url: string | null;
}

const TEACHER_COLS = "id, first_name, last_name, subject, position_az, education_az, qualification, experience_years, bio, avatar_url";
const TEACHER_WHERE = "is_public = 1 AND is_active = 1 AND deleted_at IS NULL";

export async function publicTeachers(opts: { subject?: string; limit?: number } = {}) {
  const params: unknown[] = [];
  let where = TEACHER_WHERE;
  if (opts.subject) { where += " AND subject = ?"; params.push(opts.subject); }
  params.push(opts.limit ?? 500);
  return db.query<PublicTeacher>(`SELECT ${TEACHER_COLS} FROM teachers WHERE ${where} ORDER BY sort_order, last_name, first_name LIMIT ?`, params);
}

export const publicTeacher = cache(async (id: number) => {
  return db.queryOne<PublicTeacher>(`SELECT ${TEACHER_COLS} FROM teachers WHERE id = ? AND ${TEACHER_WHERE}`, [id]);
});

export async function teacherSubjects() {
  const rows = await db.query<{ subject: string }>(`SELECT DISTINCT subject FROM teachers WHERE ${TEACHER_WHERE} AND subject IS NOT NULL AND subject <> '' ORDER BY subject`);
  return rows.map((r) => r.subject);
}

export const leadership = cache(async () => {
  return db.query<{ id: number; full_name: string; position_az: string; photo_url: string | null; bio_az: string | null; education_az: string | null; experience_az: string | null; message_az: string | null; reception_hours_az: string | null; is_director: number }>(
    "SELECT id, full_name, position_az, photo_url, bio_az, education_az, experience_az, message_az, reception_hours_az, is_director FROM leadership WHERE is_published = 1 ORDER BY is_director DESC, sort_order, id"
  );
});

export async function achievements(limit = 20) {
  return db.query<{ id: number; title_az: string; description_az: string | null; year_label: string | null; image_url: string | null }>(
    "SELECT id, title_az, description_az, year_label, image_url FROM achievements WHERE is_published = 1 ORDER BY sort_order, id DESC LIMIT ?",
    [limit]
  );
}

export async function usefulLinks() {
  return db.query<{ id: number; title_az: string; url: string }>("SELECT id, title_az, url FROM useful_links WHERE is_published = 1 ORDER BY sort_order, id");
}

export interface PublicEvent {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  cover_image: string | null;
  status: string;
}

const EVENT_COLS = "id, title_az AS title, slug, description_az AS description, start_datetime, end_datetime, location_az AS location, cover_image, status";

export async function upcomingEvents(limit = 6) {
  return db.query<PublicEvent>(
    `SELECT ${EVENT_COLS} FROM events WHERE is_published = 1 AND deleted_at IS NULL AND status IN ('planned','ongoing') AND COALESCE(end_datetime, start_datetime) >= baku_now()
      ORDER BY start_datetime LIMIT ?`,
    [limit]
  );
}

export async function eventsInRange(from: string, to: string) {
  return db.query<PublicEvent>(
    `SELECT ${EVENT_COLS} FROM events WHERE is_published = 1 AND deleted_at IS NULL AND start_datetime BETWEEN ? AND ? ORDER BY start_datetime`,
    [`${from} 00:00:00`, `${to} 23:59:59`]
  );
}

export async function pastEvents(page = 1, pageSize = 12) {
  const total = await db.queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM events WHERE is_published = 1 AND deleted_at IS NULL AND start_datetime < baku_now()");
  const rows = await db.query<PublicEvent>(
    `SELECT ${EVENT_COLS} FROM events WHERE is_published = 1 AND deleted_at IS NULL AND start_datetime < baku_now() ORDER BY start_datetime DESC LIMIT ? OFFSET ?`,
    [pageSize, (page - 1) * pageSize]
  );
  return { rows, total: Number(total?.n || 0), page, pageSize };
}

export const publicEvent = cache(async (slug: string) => {
  return db.queryOne<PublicEvent & { participants: string | null; gallery_id: number | null }>(
    `SELECT ${EVENT_COLS}, participants_az AS participants, gallery_id FROM events WHERE slug = ? AND is_published = 1 AND deleted_at IS NULL`,
    [slug]
  );
});

const GALLERY_WHERE = "g.is_published = 1 AND g.deleted_at IS NULL AND (g.contains_minors = 0 OR g.consent_confirmed = 1)";

export async function publicGalleries(opts: { category?: string; year?: number; page?: number; pageSize?: number } = {}) {
  const where = [GALLERY_WHERE];
  const params: unknown[] = [];
  if (opts.category) { where.push("g.category_az = ?"); params.push(opts.category); }
  if (opts.year) { where.push("EXTRACT(YEAR FROM g.event_date)::int = ?"); params.push(opts.year); }
  const pageSize = opts.pageSize ?? 12;
  const page = opts.page ?? 1;
  const total = await db.queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM galleries g WHERE ${where.join(" AND ")}`, params);
  const rows = await db.query<{ id: number; title_az: string; slug: string; cover_image: string | null; event_date: string | null; category_az: string | null; image_count: number; video_count: number }>(
    `SELECT g.id, g.title_az, g.slug, COALESCE(g.cover_image, (SELECT gi.image_url FROM gallery_images gi WHERE gi.gallery_id = g.id ORDER BY gi.sort_order, gi.id LIMIT 1)) AS cover_image,
            g.event_date, g.category_az,
            (SELECT COUNT(*) FROM gallery_images gi WHERE gi.gallery_id = g.id) AS image_count,
            (SELECT COUNT(*) FROM gallery_videos gv WHERE gv.gallery_id = g.id) AS video_count
       FROM galleries g WHERE ${where.join(" AND ")} ORDER BY COALESCE(g.event_date, (g.created_at AT TIME ZONE 'Asia/Baku')::date) DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  return { rows, total: Number(total?.n || 0), page, pageSize };
}

export async function galleryFilters() {
  const cats = await db.query<{ c: string }>(`SELECT DISTINCT g.category_az AS c FROM galleries g WHERE ${GALLERY_WHERE} AND g.category_az IS NOT NULL ORDER BY c`);
  const years = await db.query<{ y: number }>(`SELECT DISTINCT EXTRACT(YEAR FROM g.event_date)::int AS y FROM galleries g WHERE ${GALLERY_WHERE} AND g.event_date IS NOT NULL ORDER BY y DESC`);
  return { categories: cats.map((c) => c.c), years: years.map((y) => Number(y.y)) };
}

export const publicGallery = cache(async (slugOrId: string | number) => {
  const g = await db.queryOne<{ id: number; title_az: string; slug: string; description_az: string | null; event_date: string | null; category_az: string | null }>(
    `SELECT g.id, g.title_az, g.slug, g.description_az, g.event_date, g.category_az FROM galleries g WHERE ${typeof slugOrId === "number" ? "g.id" : "g.slug"} = ? AND ${GALLERY_WHERE}`,
    [slugOrId]
  );
  if (!g) return null;
  const images = await db.query<{ id: number; image_url: string; caption_az: string | null; alt_text: string | null }>(
    "SELECT id, image_url, caption_az, alt_text FROM gallery_images WHERE gallery_id = ? ORDER BY sort_order, id",
    [g.id]
  );
  const videos = await db.query<{ id: number; title_az: string | null; provider: "youtube" | "vimeo"; video_id: string }>(
    "SELECT id, title_az, provider, video_id FROM gallery_videos WHERE gallery_id = ? ORDER BY sort_order, id",
    [g.id]
  );
  return { ...g, images, videos };
});

export async function publicDocuments(category?: string) {
  const params: unknown[] = [];
  let where = "d.is_public = 1 AND d.deleted_at IS NULL";
  if (category) { where += " AND d.category_az = ?"; params.push(category); }
  return db.query<{ id: number; title_az: string; slug: string; category_az: string; description_az: string | null; file_url: string; file_size: number | null; published_on: string | null; created_at: string }>(
    `SELECT d.id, d.title_az, d.slug, d.category_az, d.description_az, d.file_url, d.file_size, d.published_on, d.created_at FROM documents d WHERE ${where}
      ORDER BY COALESCE(d.published_on, (d.created_at AT TIME ZONE 'Asia/Baku')::date) DESC, d.id DESC`,
    params
  );
}

/** YouTube / Vimeo keçidindən provayder və video ID-sini çıxarır (yalnız bu iki provayderə icazə var). */
export function parseVideoUrl(url: string): { provider: "youtube" | "vimeo"; videoId: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return /^[\w-]{6,20}$/.test(id) ? { provider: "youtube", videoId: id } : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop() || "";
      return /^[\w-]{6,20}$/.test(id) ? { provider: "youtube", videoId: id } : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).pop() || "";
      return /^\d{5,12}$/.test(id) ? { provider: "vimeo", videoId: id } : null;
    }
  } catch {
    return null;
  }
  return null;
}
