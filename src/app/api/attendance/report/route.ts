import { route, ok, parseQuery, Errors } from "@/lib/http";
import { z, id, isoDate } from "@/lib/validation";
import { classAttendanceReport } from "@/server/attendance";
import { canViewClass } from "@/server/access";

export const GET = route(
  async ({ req, user }) => {
    const q = parseQuery(req, z.object({ classId: id, from: isoDate, to: isoDate }));
    if (!(await canViewClass(user!, q.classId))) throw Errors.forbidden();
    return ok(await classAttendanceReport(q.classId, q.from, q.to));
  },
  { auth: true }
);
