/**
 * Server komponentləri (səhifələr) üçün qoruyucular. Uyğunsuzluqda yönləndirmə və ya 404/403 göstərilir.
 */
import "server-only";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";
import { can, type Permission } from "./permissions";

export async function requirePageUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  return user;
}

/** İcazə yoxdursa səhifənin mövcudluğunu açıqlamamaq üçün 404 qaytarılır. */
export async function requirePagePermission(permission: Permission | Permission[], nextPath?: string): Promise<CurrentUser> {
  const user = await requirePageUser(nextPath);
  const list = Array.isArray(permission) ? permission : [permission];
  if (!list.some((p) => can(user, p))) notFound();
  return user;
}
