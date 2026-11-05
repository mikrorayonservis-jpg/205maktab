import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthCard, AuthSplit } from "@/components/auth/AuthSplit";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Giriş", robots: { index: false } };

/** Qeydiyyatla eyni kompozisiya: desktop-da solda məktəb və bina fotosu, sağda forma kartı; telefonda tam en forma. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (await getCurrentUser()) redirect(safeNext);
  return (
    <AuthSplit headline="Elektron jurnal və şəxsi kabinet" lead="Şagirdlər, valideynlər, müəllimlər və məktəb rəhbərliyi üçün vahid giriş.">
      <AuthCard>
        <LoginForm next={safeNext} />
      </AuthCard>
    </AuthSplit>
  );
}
