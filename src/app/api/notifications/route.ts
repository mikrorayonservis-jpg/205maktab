import { route, ok, parseQuery } from "@/lib/http";
import { db } from "@/lib/db";
import { z } from "@/lib/validation";

export const GET = route(
  async ({ req, user }) => {
    const q = parseQuery(req, z.object({ unread: z.enum(["1", "0"]).optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }));
    const rows = await db.query(
      `SELECT id, title_az, message_az, type, link_url, is_read, created_at FROM notifications
        WHERE user_id = ? ${q.unread === "1" ? "AND is_read = 0" : ""} ORDER BY id DESC LIMIT ?`,
      [user!.id, q.limit]
    );
    const unread = await db.queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0", [user!.id]);
    return ok({ items: rows, unread: Number(unread?.n || 0) });
  },
  { auth: true }
);
