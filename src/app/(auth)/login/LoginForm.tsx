"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { AuthInput } from "@/components/auth/AuthInput";
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
        <header className="text-center">
          <h1 className="font-display text-[1.75rem] font-bold leading-tight text-ink">Xoş gəlmisiniz</h1>
          <p className="mt-1.5 text-sm text-ink-3">Qiymətlər, dərs cədvəli və ev tapşırıqları sizi gözləyir</p>
        </header>

        <form onSubmit={onSubmit} noValidate className={cn("mt-7 space-y-3.5", shake && "login-shake")} onAnimationEnd={() => setShake(false)}>
          {error && <Alert tone="danger">{error}</Alert>}
          {unverified && (
            <Alert tone="info">
              {resent ? "Yeni təsdiq keçidi göndərildi." : <button type="button" onClick={resend} className="font-medium text-primary underline">Təsdiq keçidini yenidən göndər</button>}
            </Alert>
          )}
          <AuthInput id="email" name="email" type="email" label="E-poçt" icon={Mail} placeholder="E-poçt ünvanınız" autoComplete="username" inputMode="email" required error={fields.email} />
          <AuthInput id="password" name="password" type="password" label="Parol" icon={Lock} placeholder="Parolunuz" autoComplete="current-password" required error={fields.password} />
          <div className="flex justify-end pt-0.5">
            <Link href="/forgot-password" className="rounded text-sm font-medium text-[var(--login-accent)] hover:underline">Parolu unutmusunuz?</Link>
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={loading || leaving}
            className="group h-14 w-full rounded-xl bg-[image:var(--login-btn)] text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_rgb(20_43_99/0.6)] hover:bg-[image:var(--login-btn-hover)]"
          >
            Daxil ol
            <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-ink-3">
          Hesabınız yoxdur?{" "}
          <Link href="/register" className="font-semibold text-[var(--login-accent)] hover:underline">Dəvət kodu ilə qeydiyyat</Link>
        </p>
      </div>
      {(loading || leaving) && <AuthLoading title="Daxil olunur" subtitle={leaving ? "Kabinetiniz hazırlanır" : "Məlumatlar yoxlanılır"} />}
    </>
  );
}
