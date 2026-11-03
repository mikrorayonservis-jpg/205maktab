import { route, ok, readJson } from "@/lib/http";
import { createLesson, lessonSchema } from "@/server/schedule";

export const POST = route(async ({ req, user }) => ok(await createLesson(user!.id, await readJson(req, lessonSchema), req), { status: 201 }), {
  permission: "schedule.manage",
});
