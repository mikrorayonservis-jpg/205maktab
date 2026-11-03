import { route, ok, readJson, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z, id, optionalText } from "@/lib/validation";

type P = { id: string };

async function gallery(galleryId: number) {
  const g = await db.queryOne("SELECT id FROM galleries WHERE id = ? AND deleted_at IS NULL", [galleryId]);
  if (!g) throw Errors.notFound("Albom");
}

export const GET = route<P>(
  async ({ params }) => {
    const gid = id.parse(params.id);
    await gallery(gid);
    const images = await db.query("SELECT id, image_url, caption_az, alt_text, sort_order FROM gallery_images WHERE gallery_id = ? ORDER BY sort_order, id", [gid]);
    const videos = await db.query("SELECT id, title_az, provider, video_id, sort_order FROM gallery_videos WHERE gallery_id = ? ORDER BY sort_order, id", [gid]);
    return ok({ images, videos });
  },
  { permission: "gallery.manage" }
);

/** Yüklənmiş şəkilləri albomuna əlavə edir (əvvəlcə /api/uploads ilə yüklənir). */
export const POST = route<P>(
  async ({ req, user, params }) => {
    const gid = id.parse(params.id);
    await gallery(gid);
    const body = await readJson(
      req,
      z.object({ images: z.array(z.object({ url: z.string().regex(/^\/media\/[A-Za-z0-9/_\-.]+$/), caption: optionalText(255), alt: optionalText(255) })).min(1).max(50) })
    );
    const max = await db.queryOne<{ m: number | null }>("SELECT MAX(sort_order) AS m FROM gallery_images WHERE gallery_id = ?", [gid]);
    let order = Number(max?.m ?? 0);
    for (const img of body.images) {
      const f = await db.queryOne<{ id: number }>("SELECT id FROM files WHERE storage_key = ? AND visibility = 'public' AND mime_type LIKE 'image/%'", [`public/${img.url.replace(/^\/media\//, "")}`]);
      if (!f) throw Errors.badRequest("Şəkil faylı tapılmadı.");
      await db.execute("INSERT INTO gallery_images (gallery_id, image_url, file_id, caption_az, alt_text, sort_order) VALUES (?, ?, ?, ?, ?, ?)", [
        gid, img.url, f.id, img.caption ?? null, img.alt ?? null, ++order,
      ]);
    }
    await audit({ userId: user!.id, action: "gallery.images_add", entityType: "gallery", entityId: gid, newValues: { count: body.images.length }, req });
    return ok({ added: body.images.length }, { status: 201 });
  },
  { permission: "gallery.manage" }
);
