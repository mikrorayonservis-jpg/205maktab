import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/Feedback";
import { UsersClient } from "./UsersClient";
import { ROLES } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "İstifadəçilər" };

export default async function UsersPage() {
  await requirePagePermission("users.view", "/admin/users");
  return (
    <div>
      <PageHeader eyebrow="İdarəetmə" title="İstifadəçilər" description="Yeni hesablar yalnız dəvət kodu ilə yaradılır. Rolları burada dəyişə bilərsiniz." />
      <UsersClient roles={ROLES.map((r) => ({ code: r.code, name: r.name }))} />
    </div>
  );
}
