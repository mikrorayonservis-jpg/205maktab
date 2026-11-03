import { route, readJson, ok, clientIp } from "@/lib/http";
import { z } from "@/lib/validation";
import { passwordSchema } from "@/lib/auth/password";
import { enforceIp } from "@/lib/rate-limit";
import { resetPassword } from "@/server/accounts";

const schema = z
  .object({ token: z.string().min(20).max(100), password: passwordSchema, passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, { message: "Parollar uyğun gəlmir.", path: ["passwordConfirm"] });

export const POST = route(async ({ req }) => {
  await enforceIp("reset", clientIp(req), 10, 3600);
  const input = await readJson(req, schema);
  await resetPassword(input.token, input.password);
  return ok({ message: "Parol yeniləndi. İndi yeni parolla daxil ola bilərsiniz." });
});
