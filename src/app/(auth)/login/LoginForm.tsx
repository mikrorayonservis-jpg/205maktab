"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { useHydrated } from "@/lib/client/useHydrated";
import { Alert } from "@/components/ui/Feedback";
import { AuthDivider, AuthField, AuthSubmit, authSecondaryClass } from "@/components/auth/AuthField";
import { AuthTitle } from "@/components/auth/AuthSplit";
import { AuthLoading } from "@/components/auth/AuthLoading";
import { cn } from "@/lib/utils";

// Giriş məntiqi dəyişməyib: /api/auth/login, təsdiqlənməmiş e-poçt üçün yenidən göndərmə, təhlükəsiz `next` yönləndirməsi.
export function LoginForm({ next }: { next: string }) {
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const alertRef = useRef<HTMLDivElement>(null);
  const ready = useHydrated();
  const { loading, error, fields, run } = useSubmit();

  // Uğursuz cəhddən sonra xəbərdarlıq görünən yerə gəlir (telefonda klaviatura açıq olanda forma ekrandan uzundur)
  useEffect(() => {
    if (!attempt || !alertRef.current) return;
    alertRef.current.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    alertRef.current.focus({ preventScroll: true });
  }, [attempt]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    setUnverified(null);
    const ok = await run(async () => {
      try {
        await api("/api/auth/login", { body: { email, password: String(fd.get("password") || "") }, signal: AbortSignal.timeout(25_000) });
        return true;
      } catch (err) {
        if ((err as { code?: string }).code === "EMAIL_NOT_VERIFIED") setUnverified(email);
        throw err;
      }
    });
    if (ok) {
      // Yüklənmə örtüyü yönləndirmə bitənə qədər qalır
      setLeaving(true);
      window.location.assign(next);
    } else {
      setShake(true);
      setAttempt((n) => n + 1);
    }
  }

  async function resend() {
    if (!unverified) return;
    await api("/api/auth/resend-verification", { body: { email: unverified } }).catch(() => undefined);
    setResent(true);
  }

  return (
    <>
      <div className="login-stagger">
        <AuthTitle title="Giriş" subtitle="Qiymətlər, dərs cədvəli və ev tapşırıqları sizi gözləyir" />

        <form method="post" onSubmit={onSubmit} noValidate className={cn("mt-7 space-y-4", shake && "login-shake")} onAnimationEnd={() => setShake(false)}>
          {(error || unverified) && (
            <div ref={alertRef} tabIndex={-1} className="space-y-3 focus:outline-none">
              {error && <Alert tone="danger">{error}</Alert>}
              {unverified && (
                <Alert tone="info">
                  {resent ? "Yeni təsdiq keçidi göndərildi." : <button type="button" onClick={resend} className="font-medium text-primary underline">Təsdiq keçidini yenidən göndər</button>}
                </Alert>
              )}
            </div>
          )}
          <AuthField id="email" name="email" type="email" label="E-poçt" icon={Mail} placeholder="ad@numune.az" autoComplete="username" inputMode="email" required error={fields.email} />
          <div>
            <AuthField id="password" name="password" type="password" label="Parol" icon={Lock} placeholder="Parolunuz" autoComplete="current-password" required error={fields.password} />
            <div className="mt-2 flex justify-end">
              <Link href="/forgot-password" className="rounded text-sm font-medium text-primary hover:underline">Parolu unutmusunuz?</Link>
            </div>
          </div>
          <AuthSubmit disabled={!ready || loading || leaving}>
            Daxil ol
            <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
          </AuthSubmit>
        </form>

        <div className="mt-6 space-y-4">
          <AuthDivider>Hesabınız yoxdur?</AuthDivider>
          <Link href="/register" className={authSecondaryClass}>Dəvət kodu ilə qeydiyyat</Link>
        </div>
      </div>
      {(loading || leaving) && <AuthLoading title="Daxil olunur" subtitle={leaving ? "Kabinetiniz hazırlanır" : "Məlumatlar yoxlanılır"} />}
    </>
  );
}
