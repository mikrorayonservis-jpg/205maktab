"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const { loading, error, fields, run } = useSubmit();
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await run(() => api<{ message: string }>("/api/auth/reset-password", { body: { token, password: fd.get("password"), passwordConfirm: fd.get("passwordConfirm") } }));
    if (res) setMsg(res.message);
  }
  if (!token) return <Alert tone="danger">Keçid natamamdır. E-poçtdakı keçidi tam açın.</Alert>;
  if (msg) return <><Alert tone="success">{msg}</Alert><Link href="/login" className="mt-4 inline-block text-primary hover:underline">Girişə keç</Link></>;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="danger">{error}</Alert>}
      <FormField id="password" label="Yeni parol" error={fields.password} hint="Ən azı 10 simvol, böyük və kiçik hərf, rəqəm." required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField id="passwordConfirm" label="Parolun təkrarı" error={fields.passwordConfirm} required>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required />
      </FormField>
      <Button type="submit" className="w-full" loading={loading}>Parolu yenilə</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold">Yeni parol</h1>
      <Suspense fallback={null}><ResetForm /></Suspense>
    </div>
  );
}
