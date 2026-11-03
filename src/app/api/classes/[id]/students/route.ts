import { route, ok, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { id } from "@/lib/validation";
import { canViewClass } from "@/server/access";

/** Sinif siyahısı — yalnız sinfə baxış hüququ olanlara; şəxsi əlaqə məlumatı qaytarılmır. */
export const GET = route<{ id: string }>(
  async ({ user, params }) => {
    const classId = id.parse(params.id);
    if (!(await canViewClass(user!, classId))) throw Errors.forbidden();
    return ok(
      await db.query("SELECT id, first_name, last_name, student_code FROM students WHERE class_id = ? AND deleted_at IS NULL ORDER BY last_name, first_name", [classId])
    );
  },
  { auth: true }
);
