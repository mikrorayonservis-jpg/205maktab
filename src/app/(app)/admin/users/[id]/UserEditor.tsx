"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { Alert, Card } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

export function UserEditor({ id, isActive, roles, assignable, allRoleNames }: { id: number; isActive: boolean; roles: string[]; assignable: { code: string; name: string }[]; allRoleNames: Record<string, string> }) {
  const router = useRouter();
  const toast = useToast();
  const [sel, setSel] = useState<string[]>(roles);
  const [confirm, setConfirm] = useState(false);
  const { loading, error, run } = useSubmit();
  const locked = roles.filter((r) => !assignable.some((a) => a.code === r));
  async function saveRoles() {
    const r = await run(() => api(`/api/admin/users/${id}`, { method: "PATCH", body: { roles: [...new Set([...locked, ...sel])] } }));
    if (r) { toast.success("Rollar yeniləndi."); router.refresh(); }
  }
  async function toggleActive() {
    const r = await run(() => api(`/api/admin/users/${id}`, { method: "PATCH", body: { isActive: !isActive } }));
    setConfirm(false);
    if (r) { toast.success(isActive ? "Hesab deaktiv edildi, sessiyalar bağlandı." : "Hesab aktivləşdirildi."); router.refresh(); }
  }
  return (
    <Card className="space-y-5 p-6">
      {error && <Alert tone="danger">{error}</Alert>}
      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Rollar</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {assignable.map((r) => <Checkbox key={r.code} label={r.name} checked={sel.includes(r.code)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, r.code] : s.filter((x) => x !== r.code)))} />)}
        </div>
        {locked.length > 0 && <p className="mt-2 text-xs text-ink-3">Dəyişdirə bilmədiyiniz rollar: {locked.map((r) => allRoleNames[r] ?? r).join(", ")}</p>}
        <Button className="mt-4" onClick={saveRoles} loading={loading}>Rolları yadda saxla</Button>
      </fieldset>
      <div className="border-t border-line pt-5">
        <Button variant={isActive ? "danger" : "primary"} onClick={() => setConfirm(true)}>{isActive ? "Hesabı deaktiv et" : "Hesabı aktivləşdir"}</Button>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={toggleActive} title={isActive ? "Hesabı deaktiv etmək?" : "Hesabı aktivləşdirmək?"} message={isActive ? "İstifadəçi sistemə daxil ola bilməyəcək və bütün sessiyaları bağlanacaq." : "İstifadəçi yenidən daxil ola biləcək."} danger={isActive} />
    </Card>
  );
}
