/**
 * Rəsmi elektron jurnala keçid (Path B — yalnız naviqasiya).
 * Bu modul rəsmi sistemlə HEÇ BİR məlumat mübadiləsi aparmır, onun sessiyasını görmür və autentifikasiya vəziyyəti uydurmur.
 * Yalnız: (1) yoxlanılmış rəsmi giriş ünvanlarını qaytarır, (2) istifadəçinin BU SAYTDAN keçid etdiyi anı audit jurnalına yazır.
 */
import "server-only";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hasRole } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import { getSettings, SETTING_DEFS } from "./settings";

export type OfficialTarget = "jurnal" | "digital";

export { isOfficialUrl } from "@/lib/official-url";
import { isOfficialUrl } from "@/lib/official-url";

function safe(value: string, fallback: string): string {
  return isOfficialUrl(value) ? value : fallback;
}

export { canUseOfficialJournal } from "@/lib/auth/official-access";

export interface OfficialLink {
  target: OfficialTarget;
  title: string;
  description: string;
  url: string;
  host: string;
}

export async function officialLinks(user: CurrentUser): Promise<OfficialLink[]> {
  const s = await getSettings();
  const director = hasRole(user, "director", "deputy_director") && !user.teacherId;
  const journal = safe(s.official_journal_url, SETTING_DEFS.official_journal_url.default);
  const digital = director
    ? safe(s.official_digital_director_url, SETTING_DEFS.official_digital_director_url.default)
    : safe(s.official_digital_teacher_url, SETTING_DEFS.official_digital_teacher_url.default);
  return [
    { target: "jurnal", title: "Elektron Jurnal", description: "Elm və Təhsil Nazirliyinin rəsmi elektron jurnal sistemi", url: journal, host: new URL(journal).host },
    {
      target: "digital",
      title: "Rəqəmsal məktəb",
      description: director ? "Bakı məktəbləri üçün platforma — direktor kabineti" : "Bakı məktəbləri üçün platforma — müəllim kabineti",
      url: digital,
      host: new URL(digital).host,
    },
  ];
}

export async function lastOpened(userId: number): Promise<{ at: string; target: string | null } | null> {
  const row = await db.queryOne<{ created_at: string; new_values: unknown }>(
    "SELECT created_at, new_values FROM audit_logs WHERE user_id = ? AND action = 'official_journal.open' ORDER BY id DESC LIMIT 1",
    [userId]
  );
  if (!row) return null;
  const nv = typeof row.new_values === "string" ? JSON.parse(row.new_values) : row.new_values;
  return { at: row.created_at, target: (nv as { target?: string } | null)?.target ?? null };
}

export async function recordOpen(user: CurrentUser, target: OfficialTarget, req?: NextRequest) {
  const links = await officialLinks(user);
  const link = links.find((l) => l.target === target);
  await audit({ userId: user.id, action: "official_journal.open", entityType: "official_journal", newValues: { target, host: link?.host ?? null }, req });
}
