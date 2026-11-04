import { route, ok, readJson, parseQuery } from "@/lib/http";
import { z, optionalId } from "@/lib/validation";
import { classBody, createClass, listClasses } from "@/server/classes";

/** Siniflər + şagird sayı + cari dəvət kodu */
export const GET = route(
  async ({ req }) => {
    const q = parseQuery(req, z.object({ yearId: optionalId.optional(), all: z.enum(["0", "1"]).default("0") }));
    return ok(await listClasses({ yearId: q.yearId ?? undefined, includeInactive: q.all === "1" }));
  },
  { permission: ["classes.manage", "students.enroll"] }
);

/** Sinif yaradır; dəvət kodu avtomatik yaradılır */
export const POST = route(
  async ({ req, user }) => {
    const body = await readJson(req, classBody);
    return ok(await createClass(user!, body, req), { status: 201 });
  },
  { permission: "classes.manage" }
);
