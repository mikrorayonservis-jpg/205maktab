"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";

export default function ForgotPasswordPage() {
  const { loading, error, fields, run } = useSubmit();
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "");
    const res = await run(() => api<{ message: string }>("/api/auth/forgot-password", { body: { email } }));
    if (res) setMsg(res.message);
  }
  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold">Parolun bərpası</h1>
      <p className="mt-1 text-sm text-ink-3">E-poçtunuzu daxil edin — bərpa keçidi göndəriləcək.</p>
      {msg ? (
        <Alert tone="success" className="mt-6">{msg}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <FormField id="email" label="E-poçt" error={fields.email} required>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </FormField>
          <Button type="submit" className="w-full" loading={loading}>Keçid göndər</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-primary hover:underline">Girişə qayıt</Link></p>
    </div>
  );
}
