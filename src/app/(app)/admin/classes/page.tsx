import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/Feedback";
import { ClassesClient } from "./ClassesClient";

export const metadata: Metadata = { title: "Siniflər və dəvət kodları" };

export default async function ClassesPage() {
  const u = await requirePagePermission(["classes.manage", "students.enroll"], "/admin/classes");
  return (
    <div>
      <PageHeader
        title="Siniflər və dəvət kodları"
        description="Hər sinfin öz dəvət kodu var. Şagird qeydiyyatda kodu yazanda server onu avtomatik həmin sinfə yerləşdirir."
      />
      <ClassesClient canManage={can(u, "classes.manage")} canEnroll={can(u, "students.enroll")} />
    </div>
  );
}
