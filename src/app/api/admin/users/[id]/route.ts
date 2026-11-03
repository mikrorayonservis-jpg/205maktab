import { route, ok, readJson } from "@/lib/http";
import { z, id } from "@/lib/validation";
import type { RoleCode } from "@/lib/auth/permissions";
import { getUserDetail, updateUser } from "@/server/users";

type P = { id: string };

export const GET = route<P>(async ({ params }) => ok(await getUserDetail(id.parse(params.id))), { permission: "users.view" });

export const PATCH = route<P>(
  async ({ req, user, params }) => {
    const body = await readJson(req, z.object({ isActive: z.boolean().optional(), roles: z.array(z.string().max(50)).max(12).optional() }));
    await updateUser(user!, id.parse(params.id), { isActive: body.isActive, roles: body.roles as RoleCode[] | undefined }, req);
    return ok({ updated: true });
  },
  { permission: "users.manage" }
);
