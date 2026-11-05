"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Lock, Mail, UserRound } from "lucide-react";
import { checkPassword, passwordHint, passwordInputProps } from "@/lib/password-policy";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { useHydrated } from "@/lib/client/useHydrated";
import { Alert } from "@/components/ui/Feedback";
import { AuthDivider, AuthField, AuthSubmit, authSecondaryClass } from "@/components/auth/AuthField";
import { AuthTitle } from "@/components/auth/AuthSplit";
import { AuthLoading } from "@/components/auth/AuthLoading";
import { cn } from "@/lib/utils";

const ORDER = ["code", "firstName", "lastName", "email", "password", "passwordConfirm"] as const;
// Server cavab vermirsə yüklənmə örtüyü sonsuza qədər qalmasın
const TIMEOUT_MS = 25_000;

/**
 * Qeydiyyat: sahələr və biznes qaydaları dəyişməyib (/api/auth/register).
 * Sinif və rol serverdə dəvət kodundan təyin olunur — formada sinif və ya rol seçimi yoxdur.
 *
 * Telefonda forma ekrandan uzundur: istifadəçi düyməni basanda yuxarıdakı xəta görünmürdü və səhifə
 * "donmuş" kimi qalırdı. İndi hər uğursuz cəhddən sonra ilk xətalı sahəyə (və ya ümumi xəbərdarlığa)
 * sürüşdürülür və fokus ora keçir.
 */
export function RegisterForm() {
  const ready = useHydrated();
  const { loading, error, fields, run, invalid } = useSubmit();
  const [done, setDone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Partial<Record<(typeof ORDER)[number], HTMLInputElement | null>>>({});

  // Sinifin qoşulma keçidi (/register?code=205-10B-XXXXX) kodu avtomatik doldurur
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code");
    if (c) setCode(c.slice(0, 40));
  }, []);
  useEffect(() => {
    if (done) {
      window.scrollTo({ top: 0 });
      doneRef.current?.focus();
    }
  }, [done]);

  // Uğursuz cəhddən sonra (render bitəndən sonra): ilk xətalı sahə, yoxdursa ümumi xəbərdarlıq
  useEffect(() => {
    if (!attempt) return;
    const first = ORDER.find((k) => fields[k]);
    const target: HTMLElement | null | undefined = first ? refs.current[first] : alertRef.current;
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
  }, [attempt, fields]);

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
      invalid(local);
      setShake(true);
      setAttempt((n) => n + 1);
      return;
    }
    const res = await run(() => api<{ message: string }>("/api/auth/register", { body, signal: AbortSignal.timeout(TIMEOUT_MS) }));
    if (res) setDone(res.message);
    else {
      setShake(true);
      setAttempt((n) => n + 1);
    }
  }

  if (done) {
    return (
      <div className="py-4 text-center sm:py-2">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
        <h1 ref={doneRef} tabIndex={-1} className="mt-4 font-display text-2xl font-bold text-ink focus:outline-none">Qeydiyyat tamamlandı</h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-2" role="status">{done}</p>
        <Link href="/login" className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-navy px-6 font-semibold text-navy-ink hover:bg-navy-hover">
          Girişə keç
        </Link>
      </div>
    );
  }

  const bind = (k: (typeof ORDER)[number]) => ({ ref: (el: HTMLInputElement | null) => { refs.current[k] = el; }, error: fields[k] });
  return (
    <>
      <div className="login-stagger mx-auto max-w-[26rem]">
        <AuthTitle title="Hesab yaradın" subtitle="Məktəb kabinetinə qoşulun" centered emblem />
        <form method="post" onSubmit={onSubmit} noValidate className={cn("mt-6 space-y-3.5", shake && "login-shake")} onAnimationEnd={() => setShake(false)}>
          {error && (
            <div ref={alertRef} tabIndex={-1} className="scroll-mt-24 focus:outline-none">
              <Alert tone="danger">{error}</Alert>
            </div>
          )}
          <AuthField
            id="code"
            name="code"
            label="Dəvət kodu"
            icon={KeyRound}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="205-10B-XXXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            inputClassName="font-mono uppercase tracking-wider placeholder:tracking-normal"
            hint="Kodu sinif rəhbərindən və ya məktəbdən alın."
            {...bind("code")}
          />
          <div className="grid grid-cols-2 gap-3">
            <AuthField id="firstName" name="firstName" label="Ad" icon={UserRound} required autoComplete="given-name" maxLength={100} placeholder="Adınız" {...bind("firstName")} />
            <AuthField id="lastName" name="lastName" label="Soyad" required autoComplete="family-name" maxLength={100} placeholder="Soyadınız" {...bind("lastName")} />
          </div>
          <AuthField id="email" name="email" type="email" label="E-poçt" icon={Mail} required autoComplete="email" inputMode="email" placeholder="ad@numune.az" {...bind("email")} />
          <AuthField id="password" name="password" type="password" label="Parol" icon={Lock} required autoComplete="new-password" placeholder="Parol yaradın" hint={passwordHint()} {...passwordInputProps()} {...bind("password")} />
          <AuthField id="passwordConfirm" name="passwordConfirm" type="password" label="Parolun təkrarı" icon={Lock} required autoComplete="new-password" placeholder="Parolu təkrarlayın" {...passwordInputProps()} {...bind("passwordConfirm")} />
          <p className="px-1 text-xs leading-relaxed text-ink-3">
            Qeydiyyatdan keçməklə <Link href="/privacy" className="font-medium text-navy underline underline-offset-2">məxfilik siyasəti</Link> ilə tanış olduğunuzu təsdiqləyirsiniz.
          </p>
          <AuthSubmit loading={loading} disabled={!ready}>Hesab yarat</AuthSubmit>
        </form>
        <div className="mt-6 space-y-4">
          <AuthDivider>Hesabınız var?</AuthDivider>
          <Link href="/login" className={authSecondaryClass}>Daxil olun</Link>
        </div>
      </div>
      {loading && <AuthLoading title="Hesab yaradılır" subtitle="Dəvət kodu yoxlanılır" />}
    </>
  );
}
