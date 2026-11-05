import { AuthHeader } from "@/components/auth/AuthHeader";

// Parol bərpası və e-poçt təsdiqi: giriş/qeydiyyatla eyni başlıq və fon, mərkəzdə kart (ThemeScope üst layout-dadır)
export default function AuthCardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-surface">
      <AuthHeader />
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:items-center sm:[background:var(--auth-bg)]">
        <div className="auth-rise w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
