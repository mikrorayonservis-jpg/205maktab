import { route, ok, readJson } from "@/lib/http";
import { id } from "@/lib/validation";
import { deleteLesson, lessonSchema, updateLesson } from "@/server/schedule";

type P = { id: string };

export const PATCH = route<P>(async ({ req, user, params }) => ok(await updateLesson(user!.id, id.parse(params.id), await readJson(req, lessonSchema), req)), {
  permission: "schedule.manage",
});

export const DELETE = route<P>(
  async ({ req, user, params }) => {
    await deleteLesson(user!.id, id.parse(params.id), req);
    return ok({ deleted: true });
  },
  { permission: "schedule.manage" }
);
