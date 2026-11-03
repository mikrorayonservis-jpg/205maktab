/** Rəhbərlik üçün ümumi statistikalar (yalnız aqreqat göstəricilər). */
import "server-only";
import { db } from "@/lib/db";
import { addDays, todayBaku } from "@/lib/format";
import { activeSchoolYear } from "./access";

export async function schoolSummary() {
  const year = await activeSchoolYear();
  const today = todayBaku();
  const from = addDays(today, -30);
  const one = async (sql: string, params: unknown[] = []) => Number((await db.queryOne<{ n: number }>(sql, params))?.n || 0);
  const students = await one("SELECT COUNT(*) AS n FROM students WHERE deleted_at IS NULL");
  const teachers = await one("SELECT COUNT(*) AS n FROM teachers WHERE deleted_at IS NULL AND is_active = 1");
  const classes = year ? await one("SELECT COUNT(*) AS n FROM classes WHERE school_year_id = ?", [year.id]) : 0;
  const users = await one("SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL AND is_active = 1");
  const pendingNews = await one("SELECT COUNT(*) AS n FROM news WHERE status = 'pending' AND deleted_at IS NULL");
  const attendance = await db.queryOne<{ total: number; absent: number; late: number }>(
    "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status IN ('excused','unexcused')) AS absent, COUNT(*) FILTER (WHERE status = 'late') AS late FROM attendance WHERE date BETWEEN ? AND ?",
    [from, today]
  );
  const gradeAvg = year
    ? await db.queryOne<{ avg: number | null; n: number }>("SELECT ROUND(AVG(grade_value), 2) AS avg, COUNT(*) AS n FROM grades WHERE deleted_at IS NULL AND school_year_id = ?", [year.id])
    : null;
  const byClass = year
    ? await db.query<{ class_id: number; class_name: string; avg: number | null; grades: number; absences: number }>(
        `SELECT c.id AS class_id, c.name AS class_name,
                (SELECT ROUND(AVG(g.grade_value), 2) FROM grades g WHERE g.class_id = c.id AND g.deleted_at IS NULL) AS avg,
                (SELECT COUNT(*) FROM grades g WHERE g.class_id = c.id AND g.deleted_at IS NULL) AS grades,
                (SELECT COUNT(*) FROM attendance a WHERE a.class_id = c.id AND a.status IN ('excused','unexcused') AND a.date BETWEEN ? AND ?) AS absences
           FROM classes c WHERE c.school_year_id = ? ORDER BY c.grade_level, c.name`,
        [from, today, year.id]
      )
    : [];
  const bySubject = year
    ? await db.query<{ subject_name: string; avg: number; n: number }>(
        `SELECT s.name_az AS subject_name, ROUND(AVG(g.grade_value), 2) AS avg, COUNT(*) AS n FROM grades g JOIN subjects s ON s.id = g.subject_id
          WHERE g.deleted_at IS NULL AND g.school_year_id = ? GROUP BY s.id, s.name_az ORDER BY s.name_az`,
        [year.id]
      )
    : [];
  const weekly = await db.query<{ wk: string; absent: number; total: number }>(
    `SELECT to_char(a.date - (EXTRACT(ISODOW FROM a.date)::int - 1), 'YYYY-MM-DD') AS wk,
            COUNT(*) FILTER (WHERE a.status IN ('excused','unexcused')) AS absent, COUNT(*) AS total
       FROM attendance a WHERE a.date >= ? GROUP BY wk ORDER BY wk`,
    [addDays(today, -84)]
  );
  return {
    year,
    counts: { students, teachers, classes, users, pendingNews },
    attendance30: { total: Number(attendance?.total || 0), absent: Number(attendance?.absent || 0), late: Number(attendance?.late || 0) },
    grades: { avg: gradeAvg?.avg == null ? null : Number(gradeAvg.avg), count: Number(gradeAvg?.n || 0) },
    byClass: byClass.map((r) => ({ ...r, avg: r.avg == null ? null : Number(r.avg), grades: Number(r.grades), absences: Number(r.absences) })),
    bySubject: bySubject.map((r) => ({ ...r, avg: Number(r.avg), n: Number(r.n) })),
    weekly: weekly.map((w) => ({ ...w, absent: Number(w.absent || 0), total: Number(w.total) })),
  };
}
