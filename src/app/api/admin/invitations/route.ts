import { route, ok, readJson, parseQuery } from "@/lib/http";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z, optionalId } from "@/lib/validation";
import { ROLES, type RoleCode } from "@/lib/auth/permissions";
import { createInvitation } from "@/server/accounts";

const roleCodes = ROLES.map((r) => r.code) as [RoleCode, ...RoleCode[]];

export const GET = route(
  async ({ req }) => {
    const q = parseQuery(req, z.object({ status: z.enum(["active", "used", "all"]).default("active"), studentId: optionalId.optional() }));
    const where = ["1=1"];
    const params: unknown[] = [];
    if (q.status === "active") where.push("i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > NOW()");
    if (q.status === "used") where.push("i.used_at IS NOT NULL");
    if (q.studentId) { where.push("i.student_id = ?"); params.push(q.studentId); }
    const rows = await db.query(
      `SELECT i.id, i.code_hint, i.role_code, i.email, i.expires_at, i.used_at, i.revoked_at, i.created_at, i.relation_type,
              CONCAT_WS(' ', s.last_name, s.first_name) AS student_name, CONCAT_WS(' ', t.last_name, t.first_name) AS teacher_name,
              u.email AS used_by_email
         FROM invitations i LEFT JOIN students s ON s.id = i.student_id LEFT JOIN teachers t ON t.id = i.teacher_id LEFT JOIN users u ON u.id = i.used_by
        WHERE ${where.join(" AND ")} ORDER BY i.id DESC LIMIT 200`,
      params
    );
    return ok(rows);
  },
  { permission: "invitations.manage" }
);

export const POST = route(
  async ({ req, user }) => {
    const body = await readJson(
      req,
      z.object({
        role: z.enum(roleCodes),
        email: z.preprocess((v) => (v === "" ? null : v), z.string().trim().toLowerCase().email().nullable().optional()),
        studentId: optionalId.optional(),
        teacherId: optionalId.optional(),
        relationType: z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(50).nullable().optional()),
        days: z.coerce.number().int().min(1).max(90).default(14),
      })
    );
    const res = await createInvitation(user!, body);
    await audit({ userId: user!.id, action: "invitation.create", entityType: "invitation", entityId: res.id, newValues: { role: body.role, studentId: body.studentId, teacherId: body.teacherId, email: body.email }, req });
    return ok(res, { status: 201 });
  },
  { permission: "invitations.manage" }
);
