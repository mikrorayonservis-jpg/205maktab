import { route, ok, parseQuery, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { z, id } from "@/lib/validation";
import { lessonsFor } from "@/server/schedule";
import { ownStudentIds } from "@/server/access";

/** Cədvəl: şagird/valideyn yalnız öz sinifləri; müəllim və işçilər istənilən sinif/müəllim/fənn. */
export const GET = route(
  async ({ req, user }) => {
    const q = parseQuery(req, z.object({ classId: id.optional(), teacherId: id.optional(), subjectId: id.optional() }));
    const u = user!;
    const staff = can(u, "schedule.view_all") || Boolean(u.teacherId);
    if (!staff) {
      const ids = await ownStudentIds(u);
      if (!ids.length) throw Errors.forbidden();
      const rows = await db.query<{ class_id: number }>("SELECT DISTINCT class_id FROM students WHERE id IN (?) AND class_id IS NOT NULL", [ids]);
      const allowed = rows.map((r) => r.class_id);
      if (q.teacherId || q.subjectId) throw Errors.forbidden();
      const classId = q.classId ?? allowed[0];
      if (!classId || !allowed.includes(classId)) throw Errors.forbidden();
      return ok(await lessonsFor({ classId }));
    }
    if (!q.classId && !q.teacherId && !q.subjectId) {
      if (u.teacherId) return ok(await lessonsFor({ teacherId: u.teacherId }));
      throw Errors.badRequest("Sinif, müəllim və ya fənn seçin.");
    }
    return ok(await lessonsFor(q));
  },
  { auth: true }
);
