import { route, ok, readJson } from "@/lib/http";
import { id } from "@/lib/validation";
import { deleteHomework, getHomework, homeworkSchema, updateHomework } from "@/server/homework";

type P = { id: string };

export const GET = route<P>(async ({ user, params }) => ok(await getHomework(user!, id.parse(params.id))), { auth: true });

export const PATCH = route<P>(
  async ({ req, user, params }) => {
    await updateHomework(user!, id.parse(params.id), await readJson(req, homeworkSchema), req);
    return ok({ updated: true });
  },
  { auth: true }
);

export const DELETE = route<P>(
  async ({ req, user, params }) => {
    await deleteHomework(user!, id.parse(params.id), req);
    return ok({ deleted: true });
  },
  { auth: true }
);
