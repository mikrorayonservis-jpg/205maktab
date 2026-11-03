import { route, ok, readJson } from "@/lib/http";
import { z } from "@/lib/validation";
import { resourceFor } from "@/server/admin-guard";
import { createResource, listResource } from "@/server/admin-crud";

type P = { resource: string };

export const GET = route<P>(
  async ({ req, user, params }) => {
    const def = resourceFor(user, params.resource, "read");
    const sp = req.nextUrl.searchParams;
    const filters: Record<string, string> = {};
    sp.forEach((v, k) => {
      if (k.startsWith("f_")) filters[k.slice(2)] = v;
    });
    const page = Math.max(1, Number(sp.get("page") || 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") || 20) || 20));
    const q = (sp.get("q") || "").slice(0, 100);
    const dir = sp.get("dir") === "desc" ? "desc" : "asc";
    return ok(await listResource(def, { q, page, pageSize, sort: sp.get("sort") || undefined, dir, filters }));
  },
  { permission: "admin.access" }
);

export const POST = route<P>(
  async ({ req, user, params }) => {
    const def = resourceFor(user, params.resource);
    const body = await readJson(req, z.record(z.unknown()));
    return ok(await createResource(def, body, user!, req), { status: 201 });
  },
  { permission: "admin.access" }
);
