import { route, ok, parseQuery, Errors } from "@/lib/http";
import { z, id, isoDate } from "@/lib/validation";
import { can } from "@/lib/auth/permissions";
import { canTeach, homeroomClassIds } from "@/server/access";
import { journalSheet } from "@/server/grades";

/** Jurnal vərəqi: sinif + fənn üzrə şagirdlər və qiymətlər. */
export const GET = route(
  async ({ req, user }) => {
    const u = user!;
    const q = parseQuery(req, z.object({ classId: id, subjectId: id, from: isoDate, to: isoDate }));
    const teaches = await canTeach(u, q.classId, q.subjectId, "grades.manage_all");
    const homeroom = u.teacherId ? (await homeroomClassIds(u.teacherId)).includes(q.classId) : false;
    if (!teaches && !homeroom && !can(u, "grades.view_all")) throw Errors.forbidden();
    return ok({ ...(await journalSheet(q.classId, q.subjectId, q.from, q.to)), canEdit: teaches });
  },
  { auth: true }
);
