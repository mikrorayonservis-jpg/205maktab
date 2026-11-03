import "server-only";
import { Errors } from "@/lib/http";
import { can } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import { getResource, type ResourceDef } from "@/config/admin-resources";

/** Resurs icazəsi: yazma üçün əsas icazə, oxuma üçün əsas və ya viewPermissions-dan biri. */
export function resourceFor(user: CurrentUser | null, key: string, mode: "read" | "write" = "write"): ResourceDef {
  const def = getResource(key);
  if (!def) throw Errors.notFound("Bölmə");
  if (!user) throw Errors.unauthorized();
  const allowed = can(user, def.permission) || (mode === "read" && (def.viewPermissions || []).some((p) => can(user, p)));
  if (!allowed) throw Errors.forbidden();
  return def;
}
