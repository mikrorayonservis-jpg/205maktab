import { headers } from "next/headers";
import { ThemeScope } from "@/components/ThemeScope";
import { PUBLIC_THEME_KEY } from "@/lib/theme-keys";

// Giriş səhifəsi tam ekran kompozisiyadır; qeydiyyat, parol bərpası və e-poçt təsdiqi (card)/layout.tsx-də kart içindədir.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <ThemeScope storageKey={PUBLIC_THEME_KEY} nonce={nonce}>
      {children}
    </ThemeScope>
  );
}
