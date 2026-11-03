/**
 * Server tərəfli sessiyalar. Cookie-də yalnız təsadüfi token saxlanır, DB-də isə onun SHA-256 hash-i.
 * Sessiya istənilən vaxt ləğv edilə bilər (çıxış, parol dəyişikliyi, admin tərəfindən deaktivasiya).
 */
import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { db } from "../db";
import { env } from "../env";
import type { PermissionHolder, RoleCode } from "./permissions";

/** HTTPS üzərində Secure + __Host- prefiksli cookie; HTTP (lokal) üzərində adi cookie. */
const secure = env.siteUrl.startsWith("https://");
export const SESSION_COOKIE = secure ? "__Host-q205_sid" : "q205_sid";

export interface CurrentUser extends PermissionHolder {
  id: number;
  sessionId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  mustChangePassword: boolean;
  primaryRole: RoleCode;
  teacherId: number | null;
  studentId: number | null;
  parentId: number | null;
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export async function createSession(userId: number, meta: { ip: string; userAgent: string }): Promise<string> {
  const token = randomToken();
  await db.execute(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent, last_seen_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?, NOW())`,
    [userId, sha256(token), env.sessionDays, meta.ip, meta.userAgent.slice(0, 400)]
  );
  return token;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: env.sessionDays * 86400,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function revokeSessionByToken(token: string) {
  await db.execute("UPDATE sessions SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL", [sha256(token)]);
}

export async function revokeAllSessions(userId: number, exceptSessionId?: number) {
  if (exceptSessionId) {
    await db.execute("UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND id <> ? AND revoked_at IS NULL", [userId, exceptSessionId]);
  } else {
    await db.execute("UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL", [userId]);
  }
}

async function loadUserByToken(token: string): Promise<CurrentUser | null> {
  const row = await db.queryOne(
    `SELECT s.id AS session_id, s.last_seen_at, u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.role,
            u.email_verified, u.must_change_password,
            (SELECT t.id FROM teachers t WHERE t.user_id = u.id AND t.deleted_at IS NULL LIMIT 1) AS teacher_id,
            (SELECT st.id FROM students st WHERE st.user_id = u.id AND st.deleted_at IS NULL LIMIT 1) AS student_id,
            (SELECT p.id FROM parents p WHERE p.user_id = u.id AND p.deleted_at IS NULL LIMIT 1) AS parent_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
        AND u.is_active = 1 AND u.deleted_at IS NULL
      LIMIT 1`,
    [sha256(token)]
  );
  if (!row) return null;

  const roleRows = await db.query<{ code: RoleCode }>(
    "SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?",
    [row.id]
  );
  const permRows = await db.query<{ code: string }>(
    `SELECT DISTINCT p.code FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = ?`,
    [row.id]
  );

  // last_seen_at-i ən çoxu 5 dəqiqədə bir yenilə
  const lastSeen = row.last_seen_at ? Date.parse(String(row.last_seen_at).replace(" ", "T") + "+04:00") : 0;
  if (!lastSeen || Date.now() - lastSeen > 5 * 60 * 1000) {
    db.execute("UPDATE sessions SET last_seen_at = NOW() WHERE id = ?", [row.session_id]).catch(() => undefined);
  }

  const roles = roleRows.map((r) => r.code);
  const first = row.first_name as string | null;
  const last = row.last_name as string | null;
  return {
    id: Number(row.id),
    sessionId: Number(row.session_id),
    email: row.email,
    firstName: first,
    lastName: last,
    fullName: [first, last].filter(Boolean).join(" ") || row.email,
    avatarUrl: row.avatar_url,
    emailVerified: Boolean(row.email_verified),
    mustChangePassword: Boolean(row.must_change_password),
    primaryRole: (roles.includes(row.role) ? row.role : roles[0] || "student") as RoleCode,
    roles,
    permissions: new Set(permRows.map((p) => p.code)),
    teacherId: row.teacher_id ? Number(row.teacher_id) : null,
    studentId: row.student_id ? Number(row.student_id) : null,
    parentId: row.parent_id ? Number(row.parent_id) : null,
  };
}

/** Cari sorğunun istifadəçisi (bir sorğu ərzində keşlənir). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20 || token.length > 100) return null;
  try {
    return await loadUserByToken(token);
  } catch (err) {
    console.error("[session]", err);
    return null;
  }
});
