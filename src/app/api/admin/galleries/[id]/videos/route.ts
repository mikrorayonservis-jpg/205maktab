import { route, ok, readJson, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z, id, optionalText } from "@/lib/validation";
import { parseVideoUrl } from "@/server/content";

export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    const gid = id.parse(params.id);
    const body = await readJson(req, z.object({ url: z.string().trim().url().max(500), title: optionalText(255) }));
    const parsed = parseVideoUrl(body.url);
    if (!parsed) throw Errors.badRequest("Yalnız YouTube və Vimeo keçidləri dəstəklənir.", { url: "Keçid tanınmadı." });
    const g = await db.queryOne("SELECT id FROM galleries WHERE id = ? AND deleted_at IS NULL", [gid]);
    if (!g) throw Errors.notFound("Albom");
    const res = await db.execute("INSERT INTO gallery_videos (gallery_id, title_az, provider, video_id) VALUES (?, ?, ?, ?)", [gid, body.title ?? null, parsed.provider, parsed.videoId]);
    await audit({ userId: user!.id, action: "gallery.video_add", entityType: "gallery", entityId: gid, newValues: parsed, req });
    return ok({ id: res.insertId }, { status: 201 });
  },
  { permission: "gallery.manage" }
);
