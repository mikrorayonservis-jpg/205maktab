import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/Feedback";
import { ParentsClient } from "./ParentsClient";

export const metadata: Metadata = { title: "Valideyn əlaqələri" };

export default async function ParentsPage() {
  await requirePagePermission("parents.link", "/admin/parents");
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="İdarəetmə" title="Valideyn–şagird əlaqələri" description="Valideyn yalnız ona bağlanmış uşağın məlumatlarını görür. Yeni valideyn üçün “Dəvət kodları” bölməsindən istifadə edin." />
      <ParentsClient />
    </div>
  );
}
