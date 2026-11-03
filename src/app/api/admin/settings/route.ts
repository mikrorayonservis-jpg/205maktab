import { route, ok, readJson, AppError } from "@/lib/http";
import { audit } from "@/lib/audit";
import { z } from "@/lib/validation";
import { getSettings, saveSettings, SETTING_DEFS, type Settings } from "@/server/settings";
import { isOfficialUrl } from "@/server/official-journal";

export const GET = route(async () => ok({ values: await getSettings(), defs: SETTING_DEFS }), { permission: "settings.manage" });

export const PUT = route(
  async ({ req, user }) => {
    const shape = Object.fromEntries(Object.keys(SETTING_DEFS).map((k) => [k, z.string().max(2000).optional()]));
    const body = (await readJson(req, z.object(shape).strict())) as Partial<Settings>;
    for (const k of ["social_facebook", "social_instagram", "social_youtube", "map_embed_url"] as const) {
      const v = body[k];
      if (v && !/^https:\/\/[^\s"'<>]+$/i.test(v)) throw new AppError(422, "VALIDATION", "Formada səhvlər var.", { [k]: "Keçid https:// ilə başlamalıdır." });
    }
    for (const k of ["official_journal_url", "official_digital_teacher_url", "official_digital_director_url"] as const) {
      const v = body[k];
      if (v && !isOfficialUrl(v)) {
        throw new AppError(422, "VALIDATION", "Formada səhvlər var.", { [k]: "Yalnız https:// ilə başlayan rəsmi *.edu.az və ya *.gov.az ünvanı." });
      }
    }
    const mail = body.official_support_email;
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new AppError(422, "VALIDATION", "Formada səhvlər var.", { official_support_email: "E-poçt düzgün deyil." });
    await saveSettings(body, user!.id);
    await audit({ userId: user!.id, action: "settings.update", entityType: "site_settings", newValues: body, req });
    return ok({ saved: true });
  },
  { permission: "settings.manage" }
);
