"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { checkPassword, passwordHint, passwordInputProps } from "@/lib/password-policy";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Alert } from "@/components/ui/Feedback";
import { AuthField, AuthSubmit } from "@/components/auth/AuthField";
import { AuthTitle } from "@/components/auth/AuthSplit";
import { AuthLoading } from "@/components/auth/AuthLoading";
import { cn } from "@/lib/utils";

/**
 * Qeydiyyat: sahələr və biznes qaydaları dəyişməyib (/api/auth/register).
 * Sinif və rol serverdə dəvət kodundan təyin olunur — formada sinif və ya rol seçimi yoxdur.
 */
export function RegisterForm() {
  const { loading, error, fields, run, invalid } = useSubmit();
  const [done, setDone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const doneRef = useRef<HTMLHeadingElement>(null);

  // Sinifin qoşulma keçidi (/register?code=205-10B-XXXXX) kodu avtomatik doldurur
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code");
    if (c) setCode(c.slice(0, 40));
  }, []);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const local: Record<string, string> = {};
    if (!body.code?.trim()) local.code = "Dəvət kodunu daxil edin.";
    if (!body.firstName?.trim()) local.firstName = "Adınızı yazın.";
    if (!body.lastName?.trim()) local.lastName = "Soyadınızı yazın.";
    if (!/^\S+@\S+\.\S+$/.test(body.email || "")) local.email = "E-poçt ünvanını düzgün yazın.";
    const pw = checkPassword(body.password || "");
    if (pw) local.password = pw;
    else if (body.password !== body.passwordConfirm) local.passwordConfirm = "Parollar uyğun gəlmir.";
    if (Object.keys(local).length) {
      setShake(true);
      return invalid(local);
    }
    const res = await run(() => api<{ message: string }>("/api/auth/register", { body }));
    if (res) setDone(res.message);
    else setShake(true);
  }

  if (done) {
    return (
      <div className="py-4 text-center sm:py-2">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
        <h1 ref={doneRef} tabIndex={-1} className="mt-4 font-display text-2xl font-bold text-ink focus:outline-none">Qeydiyyat tamamlandı</h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-2" role="status">{done}</p>
        <Link href="/login" className="mt-7 inline-flex h-[52px] w-full items-center justify-center rounded-lg bg-navy px-6 font-semibold text-navy-ink hover:bg-navy-hover">
          Girişə keç
        </Link>
      </div>
    );
  }

  const err = (k: string) => fields[k];
  return (
    <>
      <div className="login-stagger">
        <AuthTitle title="Qeydiyyat" subtitle="Təhsil yolunda birlikdə daha irəliyə" />
        <form onSubmit={onSubmit} noValidate className={cn("mt-6 space-y-4", shake && "login-shake")} onAnimationEnd={() => setShake(false)}>
          {error && <Alert tone="danger">{error}</Alert>}
          <AuthField
            id="code"
            name="code"
            label="Dəvət kodu"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Sinif dəvət kodunu daxil edin"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            inputClassName="font-mono uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
            hint="Kodu sinif rəhbərindən və ya məktəb administrasiyasından alın (məs. 205-10B-XXXXX)."
            error={err("code")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField id="firstName" name="firstName" label="Ad" required autoComplete="given-name" maxLength={100} error={err("firstName")} />
            <AuthField id="lastName" name="lastName" label="Soyad" required autoComplete="family-name" maxLength={100} error={err("lastName")} />
          </div>
          <AuthField id="email" name="email" type="email" label="E-poçt" required autoComplete="email" inputMode="email" placeholder="ad@numune.az" error={err("email")} />
          <AuthField id="password" name="password" type="password" label="Parol" required autoComplete="new-password" hint={passwordHint()} error={err("password")} {...passwordInputProps()} />
          <AuthField id="passwordConfirm" name="passwordConfirm" type="password" label="Parolun təkrarı" required autoComplete="new-password" error={err("passwordConfirm")} {...passwordInputProps()} />
          <p className="text-xs leading-relaxed text-ink-3">
            <span className="text-danger" aria-hidden="true">*</span> məcburi sahələr. Qeydiyyatdan keçməklə{" "}
            <Link href="/privacy" className="text-primary underline underline-offset-2">məxfilik siyasəti</Link> ilə tanış olduğunuzu təsdiqləyirsiniz.
          </p>
          <AuthSubmit loading={loading}>Hesab yarat</AuthSubmit>
        </form>
        <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-3">
          Hesabınız var? <Link href="/login" className="font-semibold text-primary hover:underline">Daxil olun</Link>
        </p>
      </div>
      {loading && <AuthLoading title="Hesab yaradılır" subtitle="Dəvət kodu yoxlanılır" />}
    </>
  );
}
