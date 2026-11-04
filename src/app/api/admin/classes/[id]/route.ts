import { route, ok, readJson } from "@/lib/http";
import { z, id } from "@/lib/validation";
import { classBody, updateClass } from "@/server/classes";

export const PATCH = route<{ id: string }>(
  async ({ req, user, params }) => {
    const body = await readJson(req, classBody.omit({ schoolYearId: true }).partial().extend({ isActive: z.boolean().optional() }));
    await updateClass(user!, id.parse(params.id), body, req);
    return ok({ saved: true });
  },
  { permission: "classes.manage" }
);
