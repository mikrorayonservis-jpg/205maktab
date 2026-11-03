import { route, ok, readJson } from "@/lib/http";
import { id } from "@/lib/validation";
import { deleteGrade, updateGrade, updateGradeSchema } from "@/server/grades";

type P = { id: string };

export const PATCH = route<P>(
  async ({ req, user, params }) => ok(await updateGrade(user!, id.parse(params.id), await readJson(req, updateGradeSchema), req)),
  { permission: ["grades.manage_own", "grades.manage_all"] }
);

export const DELETE = route<P>(
  async ({ req, user, params }) => {
    await deleteGrade(user!, id.parse(params.id), req);
    return ok({ deleted: true });
  },
  { permission: ["grades.manage_own", "grades.manage_all"] }
);
