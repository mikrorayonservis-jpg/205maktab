import { route, readJson, ok, clientIp } from "@/lib/http";
import { registerSchema } from "@/lib/register-schema";
import { enforceIp } from "@/lib/rate-limit";
import { registerWithInvitation } from "@/server/accounts";

export const POST = route(async ({ req }) => {
  await enforceIp("register", clientIp(req), 10, 3600);
  const input = await readJson(req, registerSchema);
  const r = await registerWithInvitation(input);
  const message = r.className
    ? r.verified
      ? `Qeydiyyat tamamlandı. Siz ${r.className} sinfinə qoşuldunuz. İndi daxil ola bilərsiniz.`
      : `Qeydiyyat tamamlandı. Siz ${r.className} sinfinə qoşuldunuz. Hesabı aktivləşdirmək üçün e-poçtunuza göndərilən keçidə daxil olun.`
    : r.verified
    ? "Qeydiyyat tamamlandı. İndi daxil ola bilərsiniz. Rolunuzu (şagird, valideyn, müəllim) məktəb administrasiyası təyin edəcək."
    : r.general
      ? "Qeydiyyat tamamlandı. E-poçtunuza göndərilən keçidlə hesabı təsdiqləyin. Rolunuzu məktəb administrasiyası təyin edəcək."
      : "Qeydiyyat tamamlandı. Hesabı aktivləşdirmək üçün e-poçtunuza göndərilən keçidə daxil olun.";
  return ok({ message }, { status: 201 });
});
