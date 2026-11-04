import { route, ok, readJson, parseQuery } from "@/lib/http";
import { db } from "@/lib/db";
import { z, id } from "@/lib/validation";
import { moveStudents } from "@/server/classes";

const PAGE = 50;

/**
 * Yerləşdirmə siyahısı: sinif üzrə (və ya sinifsiz) şagirdlər, axtarış, səhifələmə.
 * 1000+ şagird üçün server tərəfində süzülür — brauzerə yalnız bir səhifə gedir.
 */
export const GET = route(
  async ({ req }) => {
    const q = parseQuery(
      req,
      z.object({
        class: z.union([z.literal("none"), z.literal("all"), z.coerce.number().int().positive()]).default("all"),
        q: z.string().trim().max(100).optional(),
        page: z.coerce.number().int().min(1).max(1000).default(1),
      })
    );
    const where = ["s.deleted_at IS NULL"];
    const params: unknown[] = [];
    if (q.class === "none") where.push("s.class_id IS NULL");
    else if (q.class !== "all") { where.push("s.class_id = ?"); params.push(q.class); }
    if (q.q) {
      where.push("(s.first_name ILIKE ? OR s.last_name ILIKE ? OR s.student_code ILIKE ?)");
      const like = `%${q.q.replace(/[\%_]/g, "\$&")}%`;
      params.push(like, like, like);
    }
    const base = `FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE ${where.join(" AND ")}`;
    const [rows, total] = await Promise.all([
      db.query(
        `SELECT s.id, s.student_code, s.first_name, s.last_name, s.class_id, c.name AS class_name, (s.user_id IS NOT NULL)::int AS has_account
           ${base} ORDER BY s.last_name, s.first_name, s.id LIMIT ? OFFSET ?`,
        [...params, PAGE, (q.page - 1) * PAGE]
      ),
      db.queryOne<{ n: number }>(`SELECT COUNT(*) AS n ${base}`, params),
    ]);
    return ok({ rows, total: Number(total?.n || 0), pageSize: PAGE });
  },
  { permission: "students.enroll" }
);

/** Seçilmiş şagirdləri sinfə köçürür; preview=true heç nə dəyişmir */
export const POST = route(
  async ({ req, user }) => {
    const body = await readJson(req, z.object({ studentIds: z.array(id).min(1).max(2000), classId: id, preview: z.boolean().default(true) }));
    return ok(await moveStudents(user!, body.studentIds, body.classId, body.preview, req));
  },
  { permission: "students.enroll" }
);
