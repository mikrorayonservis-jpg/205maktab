import { hasRole } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";

/** Rəsmi elektron jurnala keçid bölməsini görən rollar: müəllim, sinif rəhbəri, direktor, direktor müavini. */
export function canUseOfficialJournal(user: CurrentUser | null): boolean {
  if (!user) return false;
  return Boolean(user.teacherId) || hasRole(user, "teacher", "class_teacher", "director", "deputy_director");
}
