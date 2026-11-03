import { route, ok, readJson, parseQuery } from "@/lib/http";
import { z, id } from "@/lib/validation";
import { createHomework, homeworkSchema, listHomework } from "@/server/homework";

export const GET = route(
  async ({ req, user }) => {
    const q = parseQuery(req, z.object({ classId: id.optional(), upcoming: z.enum(["1", "0"]).optional(), mine: z.enum(["1", "0"]).optional() }));
    return ok(await listHomework(user!, { classId: q.classId, upcoming: q.upcoming === "1", mine: q.mine === "1" }));
  },
  { auth: true }
);

export const POST = route(async ({ req, user }) => ok(await createHomework(user!, await readJson(req, homeworkSchema), req), { status: 201 }), {
  permission: ["homework.manage_own", "school.manage"],
});
