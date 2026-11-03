import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { getSettings, SETTING_DEFS } from "@/server/settings";
import { PageHeader } from "@/components/ui/Feedback";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Sayt parametrləri" };

export default async function SettingsPage() {
  await requirePagePermission("settings.manage", "/admin/settings");
  const values = await getSettings();
  const defs = Object.entries(SETTING_DEFS).map(([key, d]) => ({ key, label: d.label, multiline: d.multiline }));
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="İdarəetmə" title="Sayt parametrləri" description="Ana səhifə, əlaqə məlumatları və SEO üçün əsas parametrlər." />
      <SettingsForm defs={defs} values={values} />
    </div>
  );
}
