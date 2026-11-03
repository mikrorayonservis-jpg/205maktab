"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

interface A { action: string; label: string; tone: "primary" | "secondary" | "danger"; needsNote?: boolean }

export function WorkflowActions({ id, actions, canDelete }: { id: number; actions: A[]; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [current, setCurrent] = useState<A | null>(null);
  const [note, setNote] = useState("");
  const [del, setDel] = useState(false);
  const { loading, error, fields, run } = useSubmit();

  async function go(a: A, withNote?: string) {
    const r = await run(() => api(`/api/editorial/${id}/transition`, { body: { action: a.action, note: withNote || null } }));
    if (r) {
      toast.success(`Əməliyyat icra edildi: ${a.label}`);
      setCurrent(null);
      setNote("");
      router.refresh();
    } else if (!a.needsNote) {
      setCurrent(a);
    }
  }
  async function remove() {
    const r = await api(`/api/editorial/${id}`, { method: "DELETE" }).catch((e) => toast.error(e.message));
    if (r) {
      toast.success("Məqalə silindi.");
      router.push("/editorial");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-3">
      <span className="mr-2 text-sm font-medium text-ink-2">İş axını:</span>
      {actions.map((a) => (
        <Button key={a.action + a.label} variant={a.tone} size="sm" loading={loading && current?.action === a.action} onClick={() => (a.needsNote ? setCurrent(a) : go(a))}>{a.label}</Button>
      ))}
      {canDelete && <Button variant="ghost" size="sm" className="ml-auto text-danger" onClick={() => setDel(true)}><Trash2 className="size-4" aria-hidden="true" /> Sil</Button>}
      {error && !current && <Alert tone="danger" className="w-full">{error}</Alert>}
      <Dialog open={Boolean(current)} onClose={() => setCurrent(null)} title={current?.label ?? ""} size="sm" footer={<><Button variant="secondary" onClick={() => setCurrent(null)}>Ləğv et</Button><Button variant={current?.tone === "danger" ? "danger" : "primary"} loading={loading} onClick={() => current && go(current, note)}>Təsdiqlə</Button></>}>
        <div className="space-y-3">
          {error && <Alert tone="danger">{error}</Alert>}
          <FormField id="wf-note" label={current?.needsNote ? "Səbəb / qeyd (müəllifə göndəriləcək)" : "Qeyd (istəyə bağlı)"} error={fields.note} required={current?.needsNote}>
            <Textarea id="wf-note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={2000} />
          </FormField>
        </div>
      </Dialog>
      <ConfirmDialog open={del} onClose={() => setDel(false)} onConfirm={remove} title="Məqaləni silmək?" message="Məqalə siyahıdan çıxarılacaq. Əməliyyat audit jurnalında qeyd olunur." confirmLabel="Sil" danger />
    </div>
  );
}
