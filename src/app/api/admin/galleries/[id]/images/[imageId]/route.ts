import { route, ok, readJson, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z, id, optionalText } from "@/lib/validation";

type P = { id: string; imageId: string };

export const PATCH = route<P>(
  async ({ req, params }) => {
    const body = await readJson(req, z.object({ caption: optionalText(255), alt: optionalText(255), sortOrder: z.coerce.number().int().min(0).max(100000).optional() }));
    const r = await db.execute(
      "UPDATE gallery_images SET caption_az = ?, alt_text = ?, sort_order = COALESCE(?, sort_order) WHERE id = ? AND gallery_id = ?",
      [body.caption ?? null, body.alt ?? null, body.sortOrder ?? null, id.parse(params.imageId), id.parse(params.id)]
    );
    if (!r.affectedRows) throw Errors.notFound("Şəkil");
    return ok({ updated: true });
  },
  { permission: "gallery.manage" }
);

export const DELETE = route<P>(
  async ({ req, user, params }) => {
    const r = await db.execute("DELETE FROM gallery_images WHERE id = ? AND gallery_id = ?", [id.parse(params.imageId), id.parse(params.id)]);
    if (!r.affectedRows) throw Errors.notFound("Şəkil");
    await audit({ userId: user!.id, action: "gallery.image_delete", entityType: "gallery", entityId: id.parse(params.id), oldValues: { imageId: params.imageId }, req });
    return ok({ deleted: true });
  },
  { permission: "gallery.manage" }
);
