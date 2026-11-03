import { route, readJson, ok, clientIp, AppError } from "@/lib/http";
import { db } from "@/lib/db";
import { z, email } from "@/lib/validation";
import { verifyPassword, fakeVerify } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { enforce, enforceIp } from "@/lib/rate-limit";

const schema = z.object({ email, password: z.string().min(1).max(200) });
const GENERIC = "E-poçt və ya parol yanlışdır.";

export const POST = route(async ({ req }) => {
  const input = await readJson(req, schema);
  const ip = clientIp(req);
  const ua = (req.headers.get("user-agent") || "").slice(0, 400);
  await enforceIp("login", ip, 30, 600);
  await enforce(`login:email:${input.email}`, 8, 900, "Bu hesab üçün çox sayda uğursuz cəhd edildi. 15 dəqiqə sonra yenidən yoxlayın.");

  const user = await db.queryOne<{ id: number; password_hash: string; is_active: number; email_verified: number; locked: number }>(
    `SELECT id, password_hash, is_active, email_verified, (locked_until IS NOT NULL AND locked_until > NOW()) AS locked
       FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
    [input.email]
  );
  const log = (success: boolean, reason: string) =>
    db.execute("INSERT INTO login_attempts (email, user_id, ip_address, user_agent, success, reason) VALUES (?, ?, ?, ?, ?, ?)", [
      input.email, user?.id ?? null, ip, ua, success ? 1 : 0, reason,
    ]);

  if (!user) {
    await fakeVerify(input.password);
    await log(false, "unknown_email");
    throw new AppError(401, "INVALID_CREDENTIALS", GENERIC);
  }
  const valid = await verifyPassword(user.password_hash, input.password);
  if (!valid || Number(user.locked) || !user.is_active) {
    if (!valid) {
      await db.execute(
        `UPDATE users SET locked_until = IF(failed_login_count + 1 >= 10, DATE_ADD(NOW(), INTERVAL 15 MINUTE), locked_until),
           failed_login_count = failed_login_count + 1 WHERE id = ?`,
        [user.id]
      );
    }
    await log(false, !valid ? "bad_password" : Number(user.locked) ? "locked" : "inactive");
    throw new AppError(401, "INVALID_CREDENTIALS", Number(user.locked) && valid ? "Hesab müvəqqəti bloklanıb. 15 dəqiqə sonra yenidən yoxlayın." : GENERIC);
  }
  if (!user.email_verified) {
    await log(false, "email_not_verified");
    throw new AppError(403, "EMAIL_NOT_VERIFIED", "E-poçt ünvanınız təsdiqlənməyib. Poçt qutunuza göndərilən keçidə daxil olun.");
  }

  await db.execute("UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?", [user.id]);
  await log(true, "ok");
  const token = await createSession(user.id, { ip, userAgent: ua });
  const res = ok({ redirect: "/dashboard" });
  setSessionCookie(res, token);
  return res;
});
