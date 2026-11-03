"use client";
import { checkPassword, passwordHint, passwordInputProps } from "@/lib/password-policy";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";

export default function RegisterPage() {
  const { loading, error, fields, run, invalid } = useSubmit();
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const pw = checkPassword(body.password || "");
    if (pw) return invalid({ password: pw });
    if (body.password !== body.passwordConfirm) return invalid({ passwordConfirm: "Parollar uyğun gəlmir." });
    const res = await run(() => api<{ message: string }>("/api/auth/register", { body }));
    if (res) setDone(res.message);
  }

  if (done) {
    return (
      <div className="rounded-md border border-line bg-surface p-8 text-center">
        <h1 className="text-2xl font-semibold">Qeydiyyat tamamlandı</h1>
        <p className="mt-3 text-ink-2">{done}</p>
        <Link href="/login" className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-ink">Girişə keç</Link>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold">Qeydiyyat</h1>
      <p className="mt-1 text-sm text-ink-3">
        Qeydiyyat yalnız məktəb tərəfindən verilən <strong className="text-ink">dəvət kodu</strong> ilə mümkündür. Kodu sinif rəhbərindən və ya məktəb administrasiyasından alın.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <FormField id="code" label="Dəvət kodu" error={fields.code} hint="Məktəbin verdiyi kod (məsələn: ABCD-EFGH-JKLM)" required>
          <Input id="code" name="code" autoComplete="off" required className="font-mono uppercase tracking-wider" aria-invalid={Boolean(fields.code)} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="firstName" label="Ad" error={fields.firstName} required>
            <Input id="firstName" name="firstName" autoComplete="given-name" required />
          </FormField>
          <FormField id="lastName" label="Soyad" error={fields.lastName} required>
            <Input id="lastName" name="lastName" autoComplete="family-name" required />
          </FormField>
        </div>
        <FormField id="email" label="E-poçt" error={fields.email} required>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </FormField>
        <FormField id="password" label="Parol" error={fields.password} hint={passwordHint()} required>
          <Input id="password" name="password" type="password" autoComplete="new-password" required {...passwordInputProps()} />
        </FormField>
        <FormField id="passwordConfirm" label="Parolun təkrarı" error={fields.passwordConfirm} required>
          <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required {...passwordInputProps()} />
        </FormField>
        <p className="text-xs text-ink-3">Qeydiyyatdan keçməklə <Link href="/privacy" className="text-primary underline">məxfilik siyasəti</Link> ilə tanış olduğunuzu təsdiqləyirsiniz.</p>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Hesab yarat</Button>
      </form>
      <p className="mt-6 border-t border-line pt-4 text-center text-sm text-ink-3">
        Hesabınız var? <Link href="/login" className="font-medium text-primary hover:underline">Daxil olun</Link>
      </p>
    </div>
  );
}
