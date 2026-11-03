import { route, ok, readJson } from "@/lib/http";
import { z, id } from "@/lib/validation";
import { resourceFor } from "@/server/admin-guard";
import { deleteResources } from "@/server/admin-crud";

export const POST = route<{ resource: string }>(
  async ({ req, user, params }) => {
    const def = resourceFor(user, params.resource);
    const body = await readJson(req, z.object({ action: z.literal("delete"), ids: z.array(id).min(1).max(200) }));
    return ok(await deleteResources(def, [...new Set(body.ids)], user!, req));
  },
  { permission: "admin.access" }
);
