import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/Feedback";
import { BroadcastForm } from "./BroadcastForm";

export const metadata: Metadata = { title: "Elan göndər" };

export default async function BroadcastPage() {
  await requirePagePermission("notifications.broadcast", "/admin/broadcast");
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Bildirişlər" title="Elan bildirişi göndər" description="Bildiriş seçilmiş qrupun bütün aktiv istifadəçilərinin kabinetində görünəcək." />
      <BroadcastForm />
    </div>
  );
}
