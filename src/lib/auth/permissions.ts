/**
 * RBAC tərifləri. Mənbə: src/config/rbac.json (miqrasiya zamanı DB ilə sinxronlaşdırılır).
 * Sessiyada icazələr DB-dən oxunur; bu modul tip təhlükəsizliyi və köməkçi funksiyalar verir.
 */
import rbac from "@/config/rbac.json";

export type RoleCode =
  | "super_admin" | "school_admin" | "director" | "deputy_director" | "teacher" | "class_teacher"
  | "chief_editor" | "editor" | "author" | "photographer" | "student" | "parent";

export type Permission =
  | "admin.access" | "users.view" | "users.manage" | "roles.manage" | "invitations.manage" | "school.manage"
  | "students.view_all" | "students.manage" | "teachers.manage" | "parents.link"
  | "schedule.view_all" | "schedule.manage" | "grades.view_all" | "grades.manage_own" | "grades.manage_all"
  | "attendance.view_all" | "attendance.manage_own" | "attendance.manage_all"
  | "homework.manage_own" | "homework.view_all" | "reports.view"
  | "news.submit" | "news.edit_any" | "news.review" | "news.publish" | "news.manage_categories"
  | "media.upload" | "events.manage" | "gallery.manage" | "documents.manage" | "content.manage"
  | "settings.manage" | "notifications.broadcast" | "audit.view";

export const ROLES = rbac.roles as { code: RoleCode; name: string; description: string; staff: boolean }[];
export const ELEVATED_ROLES = rbac.elevatedRoles as RoleCode[];

export const ROLE_NAMES: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.code, r.name]));

export function roleName(code: string): string {
  return ROLE_NAMES[code] || code;
}

export interface PermissionHolder {
  roles: RoleCode[];
  permissions: ReadonlySet<string>;
}

export function can(user: PermissionHolder | null | undefined, permission: Permission): boolean {
  return Boolean(user && user.permissions.has(permission));
}

export function canAny(user: PermissionHolder | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(user, p));
}

export function hasRole(user: PermissionHolder | null | undefined, ...roles: RoleCode[]): boolean {
  return Boolean(user && roles.some((r) => user.roles.includes(r)));
}

/** Rol təyinatı icazəsi: yüksək rolları yalnız super_admin (roles.manage) təyin edə bilər. */
export function canAssignRole(actor: PermissionHolder, role: RoleCode): boolean {
  if (!can(actor, "users.manage")) return false;
  if (role === "super_admin") return actor.roles.includes("super_admin");
  if (ELEVATED_ROLES.includes(role)) return can(actor, "roles.manage");
  return true;
}
