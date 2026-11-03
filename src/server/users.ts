/** İstifadəçi idarəetməsi: siyahı, rol təyinatı, aktivləşdirmə. Rol yüksəltmə qaydaları serverdə tətbiq olunur. */
import "server-only";
import type { NextRequest } from "next/server";
import { db, transaction } from "@/lib/db";
import { audit } from "@/lib/audit";
import { Errors } from "@/lib/http";
import { canAssignRole, ROLES, type RoleCode } from "@/lib/auth/permissions";
import { revokeAllSessions, type CurrentUser } from "@/lib/auth/session";

export async function listUsers(q: { search?: string; role?: string; page: number }) {
  const where = ["u.deleted_at IS NULL"];
  const params: unknown[] = [];
  if (q.search) {
    const like = `%${q.search.replace(/[%_\\]/g, "\\$&")}%`;
    where.push("(u.email ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ?)");
    params.push(like, like, like);
  }
  if (q.role) {
    where.push("EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.code = ?)");
    params.push(q.role);
  }
  const total = await db.queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM users u WHERE ${where.join(" AND ")}`, params);
  const rows = await db.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.email_verified, u.last_login_at, u.created_at,
            (SELECT string_agg(r.code, ',' ORDER BY r.id) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id) AS roles
       FROM users u WHERE ${where.join(" AND ")} ORDER BY u.created_at DESC LIMIT 25 OFFSET ?`,
    [...params, (q.page - 1) * 25]
  );
  return { rows: rows.map((r) => ({ ...r, roles: r.roles ? String(r.roles).split(",") : [] })), total: Number(total?.n || 0), pageSize: 25 };
}

async function rolesOf(userId: number): Promise<RoleCode[]> {
  const rows = await db.query<{ code: RoleCode }>("SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?", [userId]);
  return rows.map((r) => r.code);
}

export async function getUserDetail(userId: number) {
  const u = await db.queryOne(
    `SELECT id, email, first_name, last_name, is_active, email_verified, last_login_at, created_at FROM users WHERE id = ? AND deleted_at IS NULL`,
    [userId]
  );
  if (!u) throw Errors.notFound("İstifadəçi");
  const links = {
    teacher: await db.queryOne("SELECT id, first_name, last_name FROM teachers WHERE user_id = ?", [userId]),
    student: await db.queryOne("SELECT s.id, s.first_name, s.last_name, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.user_id = ?", [userId]),
    children: await db.query(
      `SELECT s.id, s.first_name, s.last_name, c.name AS class_name FROM parents p JOIN parent_student ps ON ps.parent_id = p.id
         JOIN students s ON s.id = ps.student_id LEFT JOIN classes c ON c.id = s.class_id WHERE p.user_id = ?`,
      [userId]
    ),
  };
  const logins = await db.query("SELECT success, reason, ip_address, created_at FROM login_attempts WHERE user_id = ? ORDER BY id DESC LIMIT 10", [userId]);
  return { user: { ...u, roles: await rolesOf(userId) }, links, logins };
}

export async function updateUser(actor: CurrentUser, userId: number, input: { isActive?: boolean; roles?: RoleCode[] }, req?: NextRequest) {
  if (userId === actor.id) throw Errors.badRequest("Öz hesabınızın rol və statusunu dəyişə bilməzsiniz.");
  const current = await rolesOf(userId);
  if (current.includes("super_admin") && !actor.roles.includes("super_admin")) throw Errors.forbidden();
  if (input.roles) {
    const valid = new Set(ROLES.map((r) => r.code));
    const next = [...new Set(input.roles)].filter((r) => valid.has(r));
    const added = next.filter((r) => !current.includes(r));
    const removed = current.filter((r) => !next.includes(r));
    for (const r of [...added, ...removed]) if (!canAssignRole(actor, r)) throw Errors.forbidden();
    await transaction(async (tx) => {
      if (removed.length) {
        await tx.execute("DELETE FROM user_roles ur USING roles r WHERE r.id = ur.role_id AND ur.user_id = ? AND r.code IN (?)", [userId, removed]);
      }
      for (const r of added) await tx.execute("INSERT INTO user_roles (user_id, role_id) SELECT ?::int, id FROM roles WHERE code = ? ON CONFLICT DO NOTHING", [userId, r]);
      await tx.execute("UPDATE users SET role = ? WHERE id = ?", [next[0] ?? "student", userId]);
      await audit({ userId: actor.id, action: "user.roles", entityType: "user", entityId: userId, oldValues: { roles: current }, newValues: { roles: next }, req }, tx);
    });
    if (removed.length) await revokeAllSessions(userId);
  }
  if (input.isActive !== undefined) {
    await db.execute("UPDATE users SET is_active = ? WHERE id = ?", [input.isActive ? 1 : 0, userId]);
    if (!input.isActive) await revokeAllSessions(userId);
    await audit({ userId: actor.id, action: input.isActive ? "user.activate" : "user.deactivate", entityType: "user", entityId: userId, req });
  }
}
