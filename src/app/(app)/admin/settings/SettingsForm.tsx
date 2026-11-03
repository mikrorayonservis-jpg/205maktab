"use client";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { Alert, Card } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

export function SettingsForm({ defs, values }: { defs: { key: string; label: string; multiline: boolean }[]; values: Record<string, string> }) {
  const [v, setV] = useState(values);
  const toast = useToast();
  const { loading, error, fields, run } = useSubmit();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await run(() => api("/api/admin/settings", { method: "PUT", body: v }));
    if (r) toast.success("Parametrlər yadda saxlanıldı.");
  }
  return (
    <form onSubmit={save} noValidate>
      <Card className="space-y-4 p-6">
        {error && <Alert tone="danger">{error}</Alert>}
        {defs.map((d) => (
          <FormField key={d.key} id={`s-${d.key}`} label={d.label} error={fields[d.key]}>
            {d.multiline ? <Textarea id={`s-${d.key}`} value={v[d.key] ?? ""} onChange={(e) => setV((x) => ({ ...x, [d.key]: e.target.value }))} rows={3} maxLength={2000} /> : <Input id={`s-${d.key}`} value={v[d.key] ?? ""} onChange={(e) => setV((x) => ({ ...x, [d.key]: e.target.value }))} maxLength={2000} />}
          </FormField>
        ))}
        <Button type="submit" loading={loading}>Yadda saxla</Button>
      </Card>
    </form>
  );
}
