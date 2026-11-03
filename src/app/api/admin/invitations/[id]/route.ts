import { route, ok, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { id } from "@/lib/validation";

export const DELETE = route<{ id: string }>(
  async ({ req, user, params }) => {
    const invId = id.parse(params.id);
    const r = await db.execute("UPDATE invitations SET revoked_at = NOW() WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL", [invId]);
    if (!r.affectedRows) throw Errors.notFound("Aktiv dəvət");
    await audit({ userId: user!.id, action: "invitation.revoke", entityType: "invitation", entityId: invId, req });
    return ok({ revoked: true });
  },
  { permission: "invitations.manage" }
);
