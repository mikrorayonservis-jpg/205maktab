import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { PAGE_SLUGS } from "@/server/settings";
import { PageHeader } from "@/components/ui/Feedback";
import { PagesEditor } from "./PagesEditor";

export const metadata: Metadata = { title: "Səhifələr" };

export default async function PagesAdmin() {
  await requirePagePermission("content.manage", "/admin/pages");
  return (
    <div>
      <PageHeader eyebrow="İdarəetmə" title="Statik səhifələr" description="“Məktəb haqqında” bölmələri, məxfilik siyasəti və istifadə qaydaları." />
      <PagesEditor slugs={Object.entries(PAGE_SLUGS).map(([slug, label]) => ({ slug, label }))} />
    </div>
  );
}
