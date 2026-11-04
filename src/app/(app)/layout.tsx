import type { Metadata } from "next";
import { headers } from "next/headers";
import { requirePageUser } from "@/lib/auth/guards";
import { roleName } from "@/lib/auth/permissions";
import { AppShell } from "@/components/app/AppShell";
import { buildNav } from "@/components/app/nav";
import { ThemeScope } from "@/components/ThemeScope";
import { dashboardThemeKey } from "@/lib/theme-keys";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <ThemeScope storageKey={dashboardThemeKey(user.id)} nonce={nonce}>
      <AppShell nav={buildNav(user)} user={{ fullName: user.fullName, email: user.email, roleLabel: user.roles.map(roleName).join(", ") }}>
        {children}
      </AppShell>
    </ThemeScope>
  );
}
