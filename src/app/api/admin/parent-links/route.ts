import { route, ok, readJson, parseQuery, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z, id, email } from "@/lib/validation";

export const GET = route(
  async ({ req }) => {
    const q = parseQuery(req, z.object({ studentId: id }));
    return ok(
      await db.query(
        `SELECT p.id AS parent_id, p.first_name, p.last_name, u.email, ps.relation_type, ps.created_at
           FROM parent_student ps JOIN parents p ON p.id = ps.parent_id JOIN users u ON u.id = p.user_id WHERE ps.student_id = ?`,
        [q.studentId]
      )
    );
  },
  { permission: "parents.link" }
);

/** Mövcud valideyn hesabını şagirdə bağlayır (e-poçt ilə). Yeni valideynlər üçün dəvət kodu istifadə edin. */
export const POST = route(
  async ({ req, user }) => {
    const body = await readJson(req, z.object({ studentId: id, email, relationType: z.string().trim().max(50).default("valideyn") }));
    const parent = await db.queryOne<{ id: number }>(
      "SELECT p.id FROM parents p JOIN users u ON u.id = p.user_id WHERE u.email = ? AND u.deleted_at IS NULL",
      [body.email]
    );
    if (!parent) throw Errors.badRequest("Bu e-poçtla valideyn hesabı tapılmadı. Valideyn üçün dəvət kodu yaradın.", { email: "Valideyn tapılmadı." });
    const st = await db.queryOne("SELECT id FROM students WHERE id = ? AND deleted_at IS NULL", [body.studentId]);
    if (!st) throw Errors.notFound("Şagird");
    const r = await db.execute("INSERT IGNORE INTO parent_student (parent_id, student_id, relation_type) VALUES (?, ?, ?)", [parent.id, body.studentId, body.relationType]);
    if (!r.affectedRows) throw Errors.conflict("Bu valideyn artıq şagirdə bağlanıb.");
    await audit({ userId: user!.id, action: "parent_link.create", entityType: "parent_student", entityId: body.studentId, newValues: { parentId: parent.id }, req });
    return ok({ linked: true }, { status: 201 });
  },
  { permission: "parents.link" }
);

export const DELETE = route(
  async ({ req, user }) => {
    const body = await readJson(req, z.object({ studentId: id, parentId: id }));
    const r = await db.execute("DELETE FROM parent_student WHERE parent_id = ? AND student_id = ?", [body.parentId, body.studentId]);
    if (!r.affectedRows) throw Errors.notFound("Əlaqə");
    await audit({ userId: user!.id, action: "parent_link.delete", entityType: "parent_student", entityId: body.studentId, oldValues: { parentId: body.parentId }, req });
    return ok({ unlinked: true });
  },
  { permission: "parents.link" }
);
