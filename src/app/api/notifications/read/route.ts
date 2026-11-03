import { route, ok, readJson } from "@/lib/http";
import { db } from "@/lib/db";
import { z, id } from "@/lib/validation";

/** Yalnız istifadəçinin öz bildirişləri yenilənir (user_id şərti). */
export const POST = route(
  async ({ req, user }) => {
    const body = await readJson(req, z.object({ ids: z.array(id).max(200).optional(), all: z.boolean().optional() }));
    if (body.all) await db.execute("UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0", [user!.id]);
    else if (body.ids?.length) await db.execute("UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND id IN (?)", [user!.id, body.ids]);
    return ok({ updated: true });
  },
  { auth: true }
);
