import { route, ok, readJson } from "@/lib/http";
import { z, id } from "@/lib/validation";
import { createMissingCodes } from "@/server/classes";

/** Seçilmiş tədris ilində kodu olmayan bütün aktiv siniflərə kod yaradır */
export const POST = route(
  async ({ req, user }) => {
    const body = await readJson(req, z.object({ yearId: id }));
    return ok(await createMissingCodes(user!, body.yearId, req), { status: 201 });
  },
  { permission: "classes.manage" }
);
