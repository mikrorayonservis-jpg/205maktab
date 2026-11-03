import { route, readJson, ok, clientIp } from "@/lib/http";
import { z, email } from "@/lib/validation";
import { enforce, enforceIp } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/server/accounts";

export const POST = route(async ({ req }) => {
  const ip = clientIp(req);
  await enforceIp("forgot", ip, 10, 3600);
  const input = await readJson(req, z.object({ email }));
  await enforce(`forgot:email:${input.email}`, 3, 3600);
  await requestPasswordReset(input.email, ip);
  return ok({ message: "Əgər bu e-poçt sistemdə qeydiyyatdadırsa, bərpa keçidi göndərildi." });
});
