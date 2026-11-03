"use client";
import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Alert, Badge } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

export function ChangePasswordForm() {
  const { loading, error, fields, run } = useSubmit();
  const toast = useToast();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const res = await run(() => api<{ message: string }>("/api/auth/change-password", { body }));
    if (res) {
      toast.success(res.message);
      form.reset();
    }
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid max-w-md gap-4" noValidate>
      {error && <Alert tone="danger">{error}</Alert>}
      <FormField id="currentPassword" label="Cari parol" error={fields.currentPassword} required>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </FormField>
      <FormField id="password" label="Yeni parol" error={fields.password} hint="Ən azı 10 simvol, böyük və kiçik hərf, rəqəm." required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField id="passwordConfirm" label="Yeni parolun təkrarı" error={fields.passwordConfirm} required>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required />
      </FormField>
      <div><Button type="submit" loading={loading}>Parolu yenilə</Button></div>
    </form>
  );
}

interface S { id: number; ip_address: string | null; user_agent: string | null; created_at: string; last_seen_at: string | null; current: boolean }

export function SessionsList() {
  const [rows, setRows] = useState<S[] | null>(null);
  const toast = useToast();
  const load = () => api<S[]>("/api/auth/sessions").then(setRows).catch(() => setRows([]));
  useEffect(() => {
    load();
  }, []);
  async function revokeOthers() {
    const r = await api<{ message: string }>("/api/auth/sessions", { method: "DELETE" }).catch((e) => toast.error(e.message));
    if (r) {
      toast.success(r.message);
      load();
    }
  }
  if (!rows) return <p className="mt-3 text-sm text-ink-3">Yüklənir…</p>;
  return (
    <div className="mt-3">
      <ul className="divide-y divide-line">
        {rows.map((s) => (
          <li key={s.id} className="flex items-start gap-3 py-3 text-sm">
            <Monitor className="mt-0.5 size-4 text-ink-3" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate">{s.user_agent || "Naməlum cihaz"}</p>
              <p className="text-xs text-ink-3">Giriş: {formatDateTime(s.created_at)} · Son aktivlik: {formatDateTime(s.last_seen_at)}</p>
            </div>
            {s.current && <Badge tone="success">Bu cihaz</Badge>}
          </li>
        ))}
      </ul>
      {rows.length > 1 && <Button variant="secondary" size="sm" className="mt-3" onClick={revokeOthers}>Digər sessiyaları bağla</Button>}
    </div>
  );
}

export function RedeemForm() {
  const { loading, error, fields, run } = useSubmit();
  const [done, setDone] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") || "");
    const r = await run(() => api<{ message: string }>("/api/auth/redeem", { body: { code } }));
    if (r) {
      setDone(r.message);
      setTimeout(() => window.location.reload(), 1200);
    }
  }
  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-3" noValidate>
      <p className="text-sm font-medium">Dəvət kodu ilə uşaq əlavə et</p>
      {error && <Alert tone="danger">{error}</Alert>}
      {done && <Alert tone="success">{done}</Alert>}
      <FormField id="code" label="Dəvət kodu" error={fields.code}>
        <Input id="code" name="code" className="font-mono uppercase tracking-wider" autoComplete="off" />
      </FormField>
      <Button type="submit" variant="secondary" loading={loading}>Əlavə et</Button>
    </form>
  );
}
