"use client";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert, Card } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

const AUDIENCE = { all: "Hamı", students: "Şagirdlər", parents: "Valideynlər", teachers: "Müəllimlər", staff: "Bütün əməkdaşlar" };

export function BroadcastForm() {
  const toast = useToast();
  const [f, setF] = useState({ title: "", message: "", audience: "all", link: "" });
  const [confirm, setConfirm] = useState(false);
  const { loading, error, fields, run } = useSubmit();
  async function send() {
    setConfirm(false);
    const r = await run(() => api("/api/admin/broadcast", { body: f }));
    if (r) { toast.success("Bildiriş göndərildi."); setF({ title: "", message: "", audience: "all", link: "" }); }
  }
  return (
    <Card className="space-y-4 p-6">
      {error && <Alert tone="danger">{error}</Alert>}
      <FormField id="b-aud" label="Auditoriya" required><Select id="b-aud" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{Object.entries(AUDIENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></FormField>
      <FormField id="b-title" label="Başlıq" error={fields.title} required><Input id="b-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={255} /></FormField>
      <FormField id="b-msg" label="Mətn" error={fields.message}><Textarea id="b-msg" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} rows={4} maxLength={2000} /></FormField>
      <FormField id="b-link" label="Saytdaxili keçid (istəyə bağlı)" hint="Məsələn: /news/yeni-elan" error={fields.link}><Input id="b-link" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></FormField>
      <Button onClick={() => setConfirm(true)} loading={loading} disabled={!f.title}>Göndər</Button>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={send} title="Bildirişi göndərmək?" message={`“${f.title}” — ${AUDIENCE[f.audience as keyof typeof AUDIENCE]} qrupuna göndəriləcək.`} confirmLabel="Göndər" />
    </Card>
  );
}
