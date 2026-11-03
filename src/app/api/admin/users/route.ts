import { route, ok, parseQuery } from "@/lib/http";
import { z } from "@/lib/validation";
import { listUsers } from "@/server/users";

export const GET = route(
  async ({ req }) => {
    const q = parseQuery(req, z.object({ q: z.string().trim().max(100).optional(), role: z.string().max(50).optional(), page: z.coerce.number().int().min(1).default(1) }));
    return ok(await listUsers({ search: q.q, role: q.role, page: q.page }));
  },
  { permission: "users.view" }
);
