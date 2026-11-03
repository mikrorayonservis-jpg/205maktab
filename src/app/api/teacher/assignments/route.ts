import { route, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { activeSchoolYear, homeroomClassIds, teacherAssignments } from "@/server/access";

/** Müəllimin sinif+fənn təyinatları (admin üçün bütün təyinatlar). */
export const GET = route(
  async ({ user }) => {
    const u = user!;
    if (can(u, "grades.manage_all") || can(u, "school.manage")) {
      const year = await activeSchoolYear();
      const rows = year
        ? await db.query(
            `SELECT cs.class_id, c.name AS class_name, c.grade_level, cs.subject_id, s.name_az AS subject_name
               FROM class_subjects cs JOIN classes c ON c.id = cs.class_id JOIN subjects s ON s.id = cs.subject_id
              WHERE cs.school_year_id = ? ORDER BY c.grade_level, c.name, s.name_az`,
            [year.id]
          )
        : [];
      return ok({ assignments: rows, homeroom: [] });
    }
    if (!u.teacherId) return ok({ assignments: [], homeroom: [] });
    const homeroomIds = await homeroomClassIds(u.teacherId);
    const homeroom = homeroomIds.length ? await db.query("SELECT id, name FROM classes WHERE id IN (?) ORDER BY name", [homeroomIds]) : [];
    return ok({ assignments: await teacherAssignments(u.teacherId), homeroom });
  },
  { auth: true }
);
