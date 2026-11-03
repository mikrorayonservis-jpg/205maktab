import { route, readJson, ok, AppError } from "@/lib/http";
import { db } from "@/lib/db";
import { z } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { hashPassword, passwordSchema, verifyPassword } from "@/lib/auth/password";
import { revokeAllSessions } from "@/lib/auth/session";
import { enforce } from "@/lib/rate-limit";

const schema = z
  .object({ currentPassword: z.string().min(1), password: passwordSchema, passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, { message: "Parollar uyğun gəlmir.", path: ["passwordConfirm"] })
  .refine((v) => v.password !== v.currentPassword, { message: "Yeni parol köhnə paroldan fərqli olmalıdır.", path: ["password"] });

export const POST = route(
  async ({ req, user }) => {
    const u = user!;
    await enforce(`chpw:${u.id}`, 5, 900);
    const input = await readJson(req, schema);
    const row = await db.queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [u.id]);
    if (!row || !(await verifyPassword(row.password_hash, input.currentPassword))) {
      throw new AppError(400, "BAD_PASSWORD", "Cari parol yanlışdır.", { currentPassword: "Cari parol yanlışdır." });
    }
    await db.execute("UPDATE users SET password_hash = ?, password_changed_at = NOW(), must_change_password = 0 WHERE id = ?", [await hashPassword(input.password), u.id]);
    await revokeAllSessions(u.id, u.sessionId);
    await audit({ userId: u.id, action: "user.password_change", entityType: "user", entityId: u.id, req });
    return ok({ message: "Parol dəyişdirildi. Digər cihazlardakı sessiyalar bağlandı." });
  },
  { auth: true }
);
