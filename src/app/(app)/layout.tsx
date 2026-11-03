import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/guards";
import { roleName } from "@/lib/auth/permissions";
import { AppShell } from "@/components/app/AppShell";
import { buildNav } from "@/components/app/nav";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return (
    <AppShell nav={buildNav(user)} user={{ fullName: user.fullName, email: user.email, roleLabel: user.roles.map(roleName).join(", ") }}>
      {children}
    </AppShell>
  );
}
