import { route, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { revokeAllSessions } from "@/lib/auth/session";

export const GET = route(
  async ({ user }) => {
    const rows = await db.query(
      `SELECT id, ip_address, user_agent, created_at, last_seen_at FROM sessions
        WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW() ORDER BY last_seen_at DESC`,
      [user!.id]
    );
    return ok(rows.map((r) => ({ ...r, current: r.id === user!.sessionId })));
  },
  { auth: true }
);

/** Cari sessiyadan başqa bütün sessiyaları bağlayır. */
export const DELETE = route(
  async ({ user }) => {
    await revokeAllSessions(user!.id, user!.sessionId);
    return ok({ message: "Digər cihazlardakı sessiyalar bağlandı." });
  },
  { auth: true }
);
