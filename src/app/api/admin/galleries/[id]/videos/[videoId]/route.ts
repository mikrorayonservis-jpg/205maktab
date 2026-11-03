import { route, ok, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { id } from "@/lib/validation";

export const DELETE = route<{ id: string; videoId: string }>(
  async ({ params }) => {
    const r = await db.execute("DELETE FROM gallery_videos WHERE id = ? AND gallery_id = ?", [id.parse(params.videoId), id.parse(params.id)]);
    if (!r.affectedRows) throw Errors.notFound("Video");
    return ok({ deleted: true });
  },
  { permission: "gallery.manage" }
);
