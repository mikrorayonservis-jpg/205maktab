import { route, ok, readJson, parseQuery, Errors } from "@/lib/http";
import { z, id, isoDate } from "@/lib/validation";
import { addDays, todayBaku } from "@/lib/format";
import { getClassAttendance, saveAttendance, saveAttendanceSchema, studentAttendance } from "@/server/attendance";
import { assertCanViewStudent } from "@/server/access";

const query = z.object({
  classId: id.optional(),
  studentId: id.optional(),
  date: isoDate.optional(),
  period: z.coerce.number().int().min(0).max(8).default(0),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

/** ?classId&date&period → qeyd forması (yalnız qeyd etmək hüququ olanlar); ?studentId → şagirdin tarixçəsi. */
export const GET = route(
  async ({ req, user }) => {
    const q = parseQuery(req, query);
    if (q.classId) return ok(await getClassAttendance(user!, q.classId, q.date ?? todayBaku(), q.period));
    if (q.studentId) {
      await assertCanViewStudent(user!, q.studentId);
      const to = q.to ?? todayBaku();
      return ok(await studentAttendance(q.studentId, q.from ?? addDays(to, -90), to));
    }
    throw Errors.badRequest("classId və ya studentId göstərilməlidir.");
  },
  { auth: true }
);

export const POST = route(
  async ({ req, user }) => ok(await saveAttendance(user!, await readJson(req, saveAttendanceSchema), req)),
  { permission: ["attendance.manage_own", "attendance.manage_all"] }
);
