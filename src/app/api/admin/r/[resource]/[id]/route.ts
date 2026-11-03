import { route, ok, readJson } from "@/lib/http";
import { z, id as idSchema } from "@/lib/validation";
import { resourceFor } from "@/server/admin-guard";
import { deleteResources, getResourceRow, updateResource } from "@/server/admin-crud";

type P = { resource: string; id: string };

export const GET = route<P>(
  async ({ user, params }) => {
    const def = resourceFor(user, params.resource);
    return ok(await getResourceRow(def, idSchema.parse(params.id)));
  },
  { permission: "admin.access" }
);

export const PATCH = route<P>(
  async ({ req, user, params }) => {
    const def = resourceFor(user, params.resource);
    const body = await readJson(req, z.record(z.unknown()));
    return ok(await updateResource(def, idSchema.parse(params.id), body, user!, req));
  },
  { permission: "admin.access" }
);

export const DELETE = route<P>(
  async ({ req, user, params }) => {
    const def = resourceFor(user, params.resource);
    return ok(await deleteResources(def, [idSchema.parse(params.id)], user!, req));
  },
  { permission: "admin.access" }
);
