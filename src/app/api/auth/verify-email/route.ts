import { route, readJson, ok, Errors } from "@/lib/http";
import { z } from "@/lib/validation";
import { verifyEmailToken } from "@/server/accounts";

export const POST = route(async ({ req }) => {
  const { token } = await readJson(req, z.object({ token: z.string().min(20).max(100) }));
  if (!(await verifyEmailToken(token))) throw Errors.badRequest("Təsdiq keçidi etibarsızdır və ya vaxtı bitib.");
  return ok({ message: "E-poçt təsdiqləndi. İndi daxil ola bilərsiniz." });
});
