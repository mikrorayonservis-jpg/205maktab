import { route, readJson, ok, clientIp } from "@/lib/http";
import { z, email, shortText } from "@/lib/validation";
import { passwordSchema } from "@/lib/auth/password";
import { enforceIp } from "@/lib/rate-limit";
import { registerWithInvitation } from "@/server/accounts";

const schema = z
  .object({
    code: z.string().trim().min(4, "Dəvət kodunu daxil edin.").max(40),
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
  const r = await registerWithInvitation(input);
  const message = r.verified
    ? "Qeydiyyat tamamlandı. İndi daxil ola bilərsiniz. Rolunuzu (şagird, valideyn, müəllim) məktəb administrasiyası təyin edəcək."
    : r.general
      ? "Qeydiyyat tamamlandı. E-poçtunuza göndərilən keçidlə hesabı təsdiqləyin. Rolunuzu məktəb administrasiyası təyin edəcək."
      : "Qeydiyyat tamamlandı. Hesabı aktivləşdirmək üçün e-poçtunuza göndərilən keçidə daxil olun.";
  return ok({ message }, { status: 201 });
});
