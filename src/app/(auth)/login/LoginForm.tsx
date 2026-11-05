"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Alert } from "@/components/ui/Feedback";
import { AuthField, AuthSubmit } from "@/components/auth/AuthField";
import { AuthTitle } from "@/components/auth/AuthSplit";
import { AuthLoading } from "@/components/auth/AuthLoading";
import { cn } from "@/lib/utils";

// Giriş məntiqi dəyişməyib: /api/auth/login, təsdiqlənməmiş e-poçt üçün yenidən göndərmə, təhlükəsiz `next` yönləndirməsi.
export function LoginForm({ next }: { next: string }) {
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [shake, setShake] = useState(false);
  const { loading, error, fields, run } = useSubmit();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    setUnverified(null);
    const ok = await run(async () => {
      try {
        await api("/api/auth/login", { body: { email, password: String(fd.get("password") || "") } });
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

        <form onSubmit={onSubmit} noValidate className={cn("mt-7 space-y-4", shake && "login-shake")} onAnimationEnd={() => setShake(false)}>
          {error && <Alert tone="danger">{error}</Alert>}
          {unverified && (
            <Alert tone="info">
              {resent ? "Yeni təsdiq keçidi göndərildi." : <button type="button" onClick={resend} className="font-medium text-primary underline">Təsdiq keçidini yenidən göndər</button>}
            </Alert>
          )}
          <AuthField id="email" name="email" type="email" label="E-poçt" placeholder="ad@numune.az" autoComplete="username" inputMode="email" required error={fields.email} />
          <div>
            <AuthField id="password" name="password" type="password" label="Parol" autoComplete="current-password" required error={fields.password} />
            <div className="mt-2 flex justify-end">
              <Link href="/forgot-password" className="rounded text-sm font-medium text-primary hover:underline">Parolu unutmusunuz?</Link>
            </div>
          </div>
          <AuthSubmit disabled={loading || leaving}>
            Daxil ol
            <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
          </AuthSubmit>
        </form>

        <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-3">
          Hesabınız yoxdur?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">Dəvət kodu ilə qeydiyyat</Link>
        </p>
      </div>
      {(loading || leaving) && <AuthLoading title="Daxil olunur" subtitle={leaving ? "Kabinetiniz hazırlanır" : "Məlumatlar yoxlanılır"} />}
    </>
  );
}
