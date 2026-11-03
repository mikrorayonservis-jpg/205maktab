import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth/guards";
import { canAssignRole, ROLES } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/Feedback";
import { InvitationsClient } from "./InvitationsClient";

export const metadata: Metadata = { title: "Dəvət kodları" };

export default async function InvitationsPage() {
  const u = await requirePagePermission("invitations.manage", "/admin/invitations");
  const roles = ROLES.filter((r) => canAssignRole(u, r.code)).map((r) => ({ code: r.code, name: r.name }));
  return (
    <div>
      <PageHeader eyebrow="İdarəetmə" title="Dəvət kodları" description="Hər kod birdəfəlikdir və yalnız yaradıldığı anda göstərilir. Kodu şəxsən və ya rəsmi kanalla çatdırın." />
      <InvitationsClient roles={roles} />
    </div>
  );
}
