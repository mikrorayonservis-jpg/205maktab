import { route, readJson, ok, clientIp } from "@/lib/http";
import { db } from "@/lib/db";
import { z, email } from "@/lib/validation";
import { enforce, enforceIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/server/accounts";

export const POST = route(async ({ req }) => {
  await enforceIp("resend", clientIp(req), 10, 3600);
  const input = await readJson(req, z.object({ email }));
  await enforce(`resend:email:${input.email}`, 3, 3600);
  const u = await db.queryOne<{ id: number }>("SELECT id FROM users WHERE email = ? AND email_verified = 0 AND is_active = 1 AND deleted_at IS NULL", [input.email]);
  if (u) await sendVerificationEmail(u.id, input.email);
  return ok({ message: "Əgər hesab təsdiqlənməyibsə, yeni keçid göndərildi." });
});
