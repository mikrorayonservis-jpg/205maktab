import { route, ok, readJson, parseQuery } from "@/lib/http";
import { createGrades, createGradesSchema, listGrades, listGradesQuery } from "@/server/grades";

/** Qiymətlər siyahısı — nəticələr həmişə istifadəçinin əhatəsi ilə filtrlənir. */
export const GET = route(async ({ req, user }) => ok(await listGrades(user!, parseQuery(req, listGradesQuery))), { auth: true });

export const POST = route(
  async ({ req, user }) => ok(await createGrades(user!, await readJson(req, createGradesSchema), req), { status: 201 }),
  { permission: ["grades.manage_own", "grades.manage_all"] }
);
