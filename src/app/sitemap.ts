import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const iso = (v: string) => new Date(String(v).replace(" ", "T") + "+04:00");
  const statics = ["", "/about", "/administration", "/teachers", "/news", "/events", "/gallery", "/documents", "/contact", "/privacy", "/terms"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  try {
    const news = await db.query<{ slug: string; updated_at: string }>(
      "SELECT slug, updated_at FROM news WHERE status = 'published' AND deleted_at IS NULL AND (contains_minors = 0 OR consent_confirmed = 1) ORDER BY published_at DESC LIMIT 5000"
    );
    const events = await db.query<{ slug: string; updated_at: string }>("SELECT slug, updated_at FROM events WHERE is_published = 1 AND deleted_at IS NULL LIMIT 2000");
    const galleries = await db.query<{ slug: string; updated_at: string }>(
      "SELECT slug, updated_at FROM galleries WHERE is_published = 1 AND deleted_at IS NULL AND (contains_minors = 0 OR consent_confirmed = 1) LIMIT 2000"
    );
    const teachers = await db.query<{ id: number; updated_at: string }>("SELECT id, updated_at FROM teachers WHERE is_public = 1 AND is_active = 1 AND deleted_at IS NULL");
    return [
      ...statics,
      ...news.map((n) => ({ url: `${base}/news/${n.slug}`, lastModified: iso(n.updated_at), priority: 0.8 })),
      ...events.map((e) => ({ url: `${base}/events/${e.slug}`, lastModified: iso(e.updated_at), priority: 0.6 })),
      ...galleries.map((g) => ({ url: `${base}/gallery/${g.slug}`, lastModified: iso(g.updated_at), priority: 0.5 })),
      ...teachers.map((t) => ({ url: `${base}/teachers/${t.id}`, lastModified: iso(t.updated_at), priority: 0.4 })),
    ];
  } catch {
    return statics;
  }
}
