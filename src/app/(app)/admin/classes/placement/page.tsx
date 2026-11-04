import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/Feedback";
import { PlacementClient } from "./PlacementClient";

export const metadata: Metadata = { title: "Şagird yerləşdirmə" };

export default async function PlacementPage() {
  await requirePagePermission("students.enroll", "/admin/classes/placement");
  return (
    <div>
      <PageHeader title="Şagird yerləşdirmə" description="Şagirdləri seçin və bir addımda başqa sinfə köçürün. Təsdiqdən əvvəl dəyişikliklərin siyahısı göstərilir." />
      <Suspense>
        <PlacementClient />
      </Suspense>
    </div>
  );
}
