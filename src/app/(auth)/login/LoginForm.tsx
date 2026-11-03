"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";

export function LoginForm({ next }: { next: string }) {
  const [show, setShow] = useState(false);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
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
    if (ok) window.location.assign(next);
  }

  async function resend() {
    if (!unverified) return;
    await api("/api/auth/resend-verification", { body: { email: unverified } }).catch(() => undefined);
    setResent(true);
  }

  return (
    <div className="rounded-md border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold">Elektron jurnala giriş</h1>
      <p className="mt-1 text-sm text-ink-3">Şagird, valideyn və əməkdaşlar üçün</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        {unverified && (
          <Alert tone="info">
            {resent ? "Yeni təsdiq keçidi göndərildi." : <button type="button" onClick={resend} className="font-medium text-primary underline">Təsdiq keçidini yenidən göndər</button>}
          </Alert>
        )}
        <FormField id="email" label="E-poçt" error={fields.email} required>
          <Input id="email" name="email" type="email" autoComplete="username" required aria-invalid={Boolean(fields.email)} />
        </FormField>
        <FormField id="password" label="Parol" error={fields.password} required>
          <div className="relative">
            <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="pr-10" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-3 hover:text-ink" aria-label={show ? "Parolu gizlət" : "Parolu göstər"} aria-pressed={show}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </FormField>
        <div className="flex justify-end text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">Parolu unutmusunuz?</Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Daxil ol</Button>
      </form>
      <p className="mt-6 border-t border-line pt-4 text-center text-sm text-ink-3">
        Hesabınız yoxdur? <Link href="/register" className="font-medium text-primary hover:underline">Dəvət kodu ilə qeydiyyat</Link>
      </p>
    </div>
  );
}
