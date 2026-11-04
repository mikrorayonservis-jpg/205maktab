import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/Feedback";
import { ImportClient } from "./ImportClient";

export const metadata: Metadata = { title: "Şagirdlərin CSV importu" };

export default async function ImportPage() {
  await requirePagePermission("students.enroll", "/admin/classes/import");
  return (
    <div>
      <PageHeader title="Şagirdlərin CSV importu" description="Faylı yükləyin, yoxlama nəticəsinə baxın, sonra təsdiqləyin. Xətalı sətir varsa heç nə yazılmır." />
      <ImportClient />
    </div>
  );
}
