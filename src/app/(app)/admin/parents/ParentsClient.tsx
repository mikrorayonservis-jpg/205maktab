"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Alert, Card, EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

interface Link { parent_id: number; first_name: string; last_name: string; email: string; relation_type: string }

export function ParentsClient() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<{ id: number; first_name: string; last_name: string; student_code: string }[]>([]);
  const [studentId, setStudentId] = useState("");
  const [links, setLinks] = useState<Link[] | null>(null);
  const [email, setEmail] = useState("");
  const { loading, error, fields, run } = useSubmit();
  useEffect(() => {
    const t = setTimeout(() => api<{ rows: typeof students }>(`/api/admin/r/students?pageSize=50&q=${encodeURIComponent(q)}`).then((r) => setStudents(r.rows)).catch(() => undefined), 250);
    return () => clearTimeout(t);
  }, [q]);
  const load = useCallback(() => { if (studentId) api<Link[]>(`/api/admin/parent-links?studentId=${studentId}`).then(setLinks).catch(() => setLinks([])); }, [studentId]);
  useEffect(load, [load]);
  async function link() {
    const r = await run(() => api("/api/admin/parent-links", { body: { studentId: Number(studentId), email } }));
    if (r) { toast.success("Valideyn bağlandı."); setEmail(""); load(); }
  }
  async function unlink(parentId: number) {
    await api("/api/admin/parent-links", { method: "DELETE", body: { studentId: Number(studentId), parentId } }).then(() => { toast.success("Əlaqə silindi."); load(); }).catch((e) => toast.error(e.message));
  }
  return (
    <div className="space-y-5">
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <FormField id="ps-q" label="Şagird axtar"><Input id="ps-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, soyad və ya kod" /></FormField>
        <FormField id="ps-s" label="Şagird"><Select id="ps-s" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">Seçin…</option>{students.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_name} ({s.student_code})</option>)}</Select></FormField>
      </Card>
      {studentId && (
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Bağlı valideynlər</h2>
          {links?.length ? (
            <ul className="divide-y divide-line">{links.map((l) => <li key={l.parent_id} className="flex items-center justify-between py-2 text-sm"><span>{l.first_name} {l.last_name} <span className="text-ink-3">· {l.email} · {l.relation_type}</span></span><Button size="sm" variant="ghost" className="text-danger" onClick={() => unlink(l.parent_id)}>Əlaqəni sil</Button></li>)}</ul>
          ) : <EmptyState title="Bağlı valideyn yoxdur" />}
          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5">
            {error && <Alert tone="danger" className="w-full">{error}</Alert>}
            <FormField id="ps-e" label="Mövcud valideyn hesabının e-poçtu" error={fields.email} className="min-w-72 flex-1"><Input id="ps-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
            <Button onClick={link} loading={loading}>Bağla</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
