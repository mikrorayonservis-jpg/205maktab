import { route, ok, readJson } from "@/lib/http";
import { z, id } from "@/lib/validation";
import { rotateClassCode, updateClassCode } from "@/server/classes";

const limits = {
  maxUses: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(1).max(10000).nullable().optional()),
  expiresAt: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarix YYYY-MM-DD formatında olmalıdır.").transform((d) => `${d} 23:59:59+04:00`).nullable().optional()
  ),
};

/** Yeni kod: köhnəsi ləğv edilir */
export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    const body = await readJson(req, z.object(limits));
    return ok(await rotateClassCode(user!, id.parse(params.id), body, req), { status: 201 });
  },
  { permission: "classes.manage" }
);

/** Cari kodun statusu / limiti / müddəti */
export const PATCH = route<{ id: string }>(
  async ({ req, user, params }) => {
    const body = await readJson(req, z.object({ isActive: z.boolean().optional(), ...limits }));
    await updateClassCode(user!, id.parse(params.id), body, req);
    return ok({ saved: true });
  },
  { permission: "classes.manage" }
);
