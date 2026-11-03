import { route, readJson, ok, clientIp } from "@/lib/http";
import { z, email, shortText } from "@/lib/validation";
import { passwordSchema } from "@/lib/auth/password";
import { enforceIp } from "@/lib/rate-limit";
import { registerWithInvitation } from "@/server/accounts";

const schema = z
  .object({
    code: z.string().trim().min(12).max(20),
    email,
    firstName: shortText(100),
    lastName: shortText(100),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, { message: "Parollar uyğun gəlmir.", path: ["passwordConfirm"] });

export const POST = route(async ({ req }) => {
  await enforceIp("register", clientIp(req), 10, 3600);
  const input = await readJson(req, schema);
  await registerWithInvitation(input);
  return ok({ message: "Qeydiyyat tamamlandı. Hesabı aktivləşdirmək üçün e-poçtunuza göndərilən keçidə daxil olun." }, { status: 201 });
});
