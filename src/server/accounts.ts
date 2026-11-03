/** Hesab əməliyyatları: dəvət kodları, qeydiyyat, e-poçt təsdiqi, parol bərpası. */
import "server-only";
import crypto from "node:crypto";
import { db, transaction, type Db } from "@/lib/db";
import { env } from "@/lib/env";
import { Errors } from "@/lib/http";
import { sendMail } from "@/lib/mailer";
import { hashPassword } from "@/lib/auth/password";
import { canAssignRole, type PermissionHolder, type RoleCode } from "@/lib/auth/permissions";
import { revokeAllSessions, sha256, randomToken } from "@/lib/auth/session";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateInvitationCode(): string {
  const bytes = crypto.randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export async function createInvitation(
  actor: PermissionHolder & { id: number },
  input: { role: RoleCode; email?: string | null; studentId?: number | null; teacherId?: number | null; relationType?: string | null; days: number }
) {
  if (!canAssignRole(actor, input.role)) throw Errors.forbidden();
  if ((input.role === "student" || input.role === "parent") && !input.studentId) {
    throw Errors.badRequest("Şagird və valideyn dəvəti üçün şagird seçilməlidir.", { studentId: "Şagird seçin." });
  }
  if (input.studentId) {
    const st = await db.queryOne<{ user_id: number | null }>("SELECT user_id FROM students WHERE id = ? AND deleted_at IS NULL", [input.studentId]);
    if (!st) throw Errors.notFound("Şagird");
    if (input.role === "student" && st.user_id) throw Errors.conflict("Bu şagirdin artıq hesabı var.");
  }
  if (input.teacherId) {
    const t = await db.queryOne<{ user_id: number | null }>("SELECT user_id FROM teachers WHERE id = ? AND deleted_at IS NULL", [input.teacherId]);
    if (!t) throw Errors.notFound("Müəllim");
    if (t.user_id) throw Errors.conflict("Bu müəllim profilinə artıq hesab bağlanıb.");
  }
  const code = generateInvitationCode();
  const norm = normalizeCode(code);
  const res = await db.execute(
    `INSERT INTO invitations (code_hash, code_hint, role_code, email, student_id, teacher_id, relation_type, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW() + make_interval(days => ?), ?)`,
    [sha256(norm), norm.slice(-4), input.role, input.email || null, input.studentId || null, input.teacherId || null, input.relationType || null, input.days, actor.id]
  );
  return { id: res.insertId, code };
}

interface InvitationRow {
  id: number;
  role_code: RoleCode;
  email: string | null;
  student_id: number | null;
  teacher_id: number | null;
  relation_type: string | null;
}

async function findValidInvitation(code: string, tx: Db = db): Promise<InvitationRow> {
  const inv = await tx.queryOne<InvitationRow>(
    `SELECT id, role_code, email, student_id, teacher_id, relation_type FROM invitations
      WHERE code_hash = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > NOW() FOR UPDATE`,
    [sha256(normalizeCode(code))]
  );
  if (!inv) throw Errors.badRequest("Dəvət kodu yanlışdır, vaxtı bitib və ya artıq istifadə olunub.", { code: "Kod etibarsızdır." });
  return inv;
}

async function linkByInvitation(tx: Db, inv: InvitationRow, userId: number, names: { firstName: string; lastName: string; email: string }) {
  if (inv.role_code === "student") {
    const r = await tx.execute("UPDATE students SET user_id = ? WHERE id = ? AND user_id IS NULL", [userId, inv.student_id]);
    if (r.affectedRows !== 1) throw Errors.conflict("Bu şagirdin artıq hesabı var.");
  } else if (inv.role_code === "parent") {
    let parent = await tx.queryOne<{ id: number }>("SELECT id FROM parents WHERE user_id = ?", [userId]);
    if (!parent) {
      const r = await tx.execute("INSERT INTO parents (user_id, first_name, last_name, email) VALUES (?, ?, ?, ?)", [userId, names.firstName, names.lastName, names.email]);
      parent = { id: r.insertId };
    }
    await tx.execute("INSERT INTO parent_student (parent_id, student_id, relation_type) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [parent.id, inv.student_id, inv.relation_type || "valideyn"]);
  } else if (inv.teacher_id) {
    const r = await tx.execute("UPDATE teachers SET user_id = ? WHERE id = ? AND user_id IS NULL", [userId, inv.teacher_id]);
    if (r.affectedRows !== 1) throw Errors.conflict("Bu müəllim profilinə artıq hesab bağlanıb.");
  }
  await tx.execute("INSERT INTO user_roles (user_id, role_id) SELECT ?::int, id FROM roles WHERE code = ? ON CONFLICT DO NOTHING", [userId, inv.role_code]);
  if (inv.role_code === "class_teacher") {
    await tx.execute("INSERT INTO user_roles (user_id, role_id) SELECT ?::int, id FROM roles WHERE code = 'teacher' ON CONFLICT DO NOTHING", [userId]);
  }
}

export async function registerWithInvitation(input: { code: string; email: string; password: string; firstName: string; lastName: string }) {
  const passwordHash = await hashPassword(input.password);
  const userId = await transaction(async (tx) => {
    const inv = await findValidInvitation(input.code, tx);
    if (inv.email && inv.email.toLowerCase() !== input.email.toLowerCase()) {
      throw Errors.badRequest("Bu dəvət kodu başqa e-poçt ünvanı üçün nəzərdə tutulub.", { email: "E-poçt dəvətə uyğun deyil." });
    }
    const existing = await tx.queryOne("SELECT id FROM users WHERE email = ?", [input.email]);
    if (existing) throw Errors.conflict("Bu e-poçt ilə hesab artıq mövcuddur. Daxil olub profil səhifəsində dəvət kodunu istifadə edin.");
    const res = await tx.execute(
      `INSERT INTO users (email, first_name, last_name, password_hash, role, is_active, email_verified, password_changed_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, NOW())`,
      [input.email, input.firstName, input.lastName, passwordHash, inv.role_code]
    );
    await linkByInvitation(tx, inv, res.insertId, input);
    const used = await tx.execute("UPDATE invitations SET used_at = NOW(), used_by = ? WHERE id = ? AND used_at IS NULL", [res.insertId, inv.id]);
    if (used.affectedRows !== 1) throw Errors.conflict("Dəvət kodu artıq istifadə olunub.");
    await tx.execute(
      "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (?, 'user.register', 'user', ?, ?)",
      [res.insertId, res.insertId, JSON.stringify({ role: inv.role_code, invitationId: inv.id })]
    );
    return res.insertId;
  });
  await sendVerificationEmail(userId, input.email);
  return { userId };
}

/** Artıq hesabı olan istifadəçi (məs. ikinci uşağı olan valideyn) dəvət kodunu istifadə edir. */
export async function redeemInvitation(user: { id: number; email: string; firstName: string | null; lastName: string | null }, code: string) {
  await transaction(async (tx) => {
    const inv = await findValidInvitation(code, tx);
    if (inv.email && inv.email.toLowerCase() !== user.email.toLowerCase()) throw Errors.badRequest("Bu dəvət kodu başqa e-poçt üçündür.");
    if (inv.role_code !== "parent") throw Errors.badRequest("Mövcud hesaba yalnız valideyn dəvət kodu əlavə edilə bilər.");
    await linkByInvitation(tx, inv, user.id, { firstName: user.firstName || "", lastName: user.lastName || "", email: user.email });
    await tx.execute("UPDATE invitations SET used_at = NOW(), used_by = ? WHERE id = ?", [user.id, inv.id]);
    await tx.execute("INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'invitation.redeem', 'invitation', ?)", [user.id, inv.id]);
  });
}

export async function sendVerificationEmail(userId: number, email: string) {
  const token = randomToken();
  await db.execute("INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, NOW() + INTERVAL '48 hours')", [userId, sha256(token)]);
  const link = `${env.siteUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return sendMail({
    to: email,
    subject: "E-poçt ünvanınızı təsdiqləyin",
    text: `Salam!\n\nMəktəb platformasında hesabınızı aktivləşdirmək üçün aşağıdakı keçidə daxil olun (48 saat etibarlıdır):\n${link}\n\nƏgər bu qeydiyyatı siz etməmisinizsə, bu məktubu nəzərə almayın.`,
  });
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  return transaction(async (tx) => {
    const row = await tx.queryOne<{ id: number; user_id: number }>(
      "SELECT id, user_id FROM email_verifications WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() FOR UPDATE",
      [sha256(token)]
    );
    if (!row) return false;
    await tx.execute("UPDATE email_verifications SET used_at = NOW() WHERE id = ?", [row.id]);
    await tx.execute("UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?", [row.user_id]);
    return true;
  });
}

export async function requestPasswordReset(email: string, ip: string) {
  const user = await db.queryOne<{ id: number }>("SELECT id FROM users WHERE email = ? AND is_active = 1 AND deleted_at IS NULL", [email]);
  if (!user) return; // istifadəçi mövcudluğu açıqlanmır
  const token = randomToken();
  await db.execute("UPDATE password_resets SET used = 1, used_at = NOW() WHERE user_id = ? AND used = 0", [user.id]);
  await db.execute(
    "INSERT INTO password_resets (user_id, token, expires_at, ip_address) VALUES (?, ?, NOW() + make_interval(mins => ?), ?)",
    [user.id, sha256(token), env.passwordResetMinutes, ip]
  );
  const link = `${env.siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    subject: "Parolun bərpası",
    text: `Salam!\n\nParolunuzu yeniləmək üçün keçid (${env.passwordResetMinutes} dəqiqə etibarlıdır):\n${link}\n\nƏgər bu sorğunu siz göndərməmisinizsə, heç nə etməyin — parolunuz dəyişməyəcək.`,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  const userId = await transaction(async (tx) => {
    const row = await tx.queryOne<{ id: number; user_id: number }>(
      "SELECT id, user_id FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW() FOR UPDATE",
      [sha256(token)]
    );
    if (!row) throw Errors.badRequest("Bərpa keçidi etibarsızdır və ya vaxtı bitib.");
    await tx.execute("UPDATE password_resets SET used = 1, used_at = NOW() WHERE id = ?", [row.id]);
    await tx.execute(
      "UPDATE users SET password_hash = ?, password_changed_at = NOW(), failed_login_count = 0, locked_until = NULL, must_change_password = 0 WHERE id = ?",
      [passwordHash, row.user_id]
    );
    await tx.execute("INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'user.password_reset', 'user', ?)", [row.user_id, row.user_id]);
    return row.user_id;
  });
  await revokeAllSessions(userId);
}
