import { route, ok, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import type { OptionSource } from "@/config/admin-resources";

const QUERIES: Record<OptionSource, string> = {
  subjects: "SELECT id AS value, name_az AS label FROM subjects ORDER BY name_az",
  classes: `SELECT c.id AS value, CONCAT(c.name, ' (', y.name, ')') AS label FROM classes c JOIN school_years y ON y.id = c.school_year_id
            ORDER BY y.is_active DESC, y.start_date DESC, c.grade_level, c.name`,
  teachers: "SELECT id AS value, CONCAT(last_name, ' ', first_name, CASE WHEN subject IS NULL THEN '' ELSE CONCAT(' — ', subject) END) AS label FROM teachers WHERE deleted_at IS NULL ORDER BY last_name, first_name",
  school_years: "SELECT id AS value, CONCAT(name, CASE WHEN is_active = 1 THEN ' (aktiv)' ELSE '' END) AS label FROM school_years ORDER BY start_date DESC",
  news_categories: "SELECT id AS value, name_az AS label FROM news_categories ORDER BY name_az",
  galleries: "SELECT id AS value, title_az AS label FROM galleries WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 500",
};

/** Seçim siyahıları. Redaksiya və müəllim formaları üçün bəzi mənbələr admin.access olmadan da açıqdır. */
export const GET = route(
  async ({ req, user }) => {
    const source = req.nextUrl.searchParams.get("source") as OptionSource | null;
    if (!source || !(source in QUERIES)) throw Errors.badRequest("Mənbə yanlışdır.");
    const openSources: OptionSource[] = ["news_categories", "subjects"];
    if (!openSources.includes(source) && !can(user, "admin.access")) throw Errors.forbidden();
    if (source === "galleries" && !can(user, "news.submit") && !can(user, "admin.access")) throw Errors.forbidden();
    const rows = await db.query<{ value: number; label: string }>(QUERIES[source]);
    return ok(rows.map((r) => ({ value: String(r.value), label: r.label })));
  },
  { auth: true }
);
