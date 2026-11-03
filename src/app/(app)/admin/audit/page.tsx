import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/Feedback";
import { AuditClient } from "./AuditClient";

export const metadata: Metadata = { title: "Audit jurnalı" };

export default async function AuditPage() {
  await requirePagePermission("audit.view", "/admin/audit");
  return (
    <div>
      <PageHeader eyebrow="Təhlükəsizlik" title="Audit jurnalı" description="Qiymət, davamiyyət, istifadəçi, məzmun və digər bütün dəyişikliklərin tarixçəsi." />
      <AuditClient />
    </div>
  );
}
