"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, Plus } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

interface Inv { id: number; code_hint: string; role_code: string; email: string | null; expires_at: string; used_at: string | null; revoked_at: string | null; student_name: string | null; teacher_name: string | null; used_by_email: string | null; relation_type: string | null }
interface Opt { value: string; label: string }

export function InvitationsClient({ roles }: { roles: { code: string; name: string }[] }) {
  const toast = useToast();
  const names = Object.fromEntries(roles.map((r) => [r.code, r.name]));
  const [status, setStatus] = useState("active");
  const [rows, setRows] = useState<Inv[] | null>(null);
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [students, setStudents] = useState<Opt[]>([]);
  const [studentQ, setStudentQ] = useState("");
  const [teachers, setTeachers] = useState<Opt[]>([]);
  const [form, setForm] = useState({ role: "parent", studentId: "", teacherId: "", email: "", relationType: "valideyn", days: "14" });
  const { loading, error, fields, run } = useSubmit();
  const load = useCallback(() => { setRows(null); api<Inv[]>(`/api/admin/invitations?status=${status}`).then(setRows).catch(() => setRows([])); }, [status]);
  useEffect(load, [load]);
  useEffect(() => {
    if (!open) return;
    api<Opt[]>("/api/admin/options?source=teachers").then(setTeachers).catch(() => undefined);
  }, [open]);
  // Şagird siyahısı serverdə axtarılır (ad, soyad və ya kod) — böyük məktəblərdə ilk 100 nəfərlə məhdudlaşmır.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      api<{ rows: { id: number; first_name: string; last_name: string; student_code: string }[] }>(`/api/admin/r/students?pageSize=50&q=${encodeURIComponent(studentQ.trim())}`)
        .then((r) => {
          const opts = r.rows.map((s) => ({ value: String(s.id), label: `${s.last_name} ${s.first_name} (${s.student_code})` }));
          setStudents((prev) => {
            const sel = prev.find((o) => o.value === form.studentId);
            return sel && !opts.some((o) => o.value === sel.value) ? [sel, ...opts] : opts;
          });
        })
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentQ]);
  const needsStudent = form.role === "student" || form.role === "parent";
  const teacherRole = form.role === "teacher" || form.role === "class_teacher";
  async function create() {
    const r = await run(() => api<{ code: string }>("/api/admin/invitations", { body: { role: form.role, email: form.email, studentId: needsStudent ? form.studentId : null, teacherId: teacherRole ? form.teacherId : null, relationType: form.role === "parent" ? form.relationType : null, days: Number(form.days) } }));
    if (r) { setCreated(r.code); load(); }
  }
  async function revoke(id: number) {
    await api(`/api/admin/invitations/${id}`, { method: "DELETE" }).then(() => { toast.success("Dəvət ləğv edildi."); load(); }).catch((e) => toast.error(e.message));
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-48"><option value="active">Aktiv</option><option value="used">İstifadə olunmuş</option><option value="all">Hamısı</option></Select>
        <Button className="ml-auto" onClick={() => { setCreated(null); setOpen(true); }}><Plus className="size-4" aria-hidden="true" /> Yeni dəvət</Button>
      </div>
      {!rows ? <Skeleton className="h-60" /> : rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="table-base">
            <thead><tr><th scope="col">Kod</th><th scope="col">Rol</th><th scope="col">Bağlı şəxs</th><th scope="col">E-poçt</th><th scope="col">Bitmə</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Əməliyyat</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">••••{r.code_hint}</td>
                  <td>{names[r.role_code] ?? r.role_code}</td>
                  <td>{r.student_name ?? r.teacher_name ?? "—"}{r.relation_type && <span className="text-xs text-ink-3"> ({r.relation_type})</span>}</td>
                  <td className="text-ink-3">{r.email ?? "—"}</td>
                  <td className="whitespace-nowrap text-ink-3">{formatDateTime(r.expires_at)}</td>
                  <td>{r.used_at ? <Badge tone="success">İstifadə edilib{r.used_by_email ? `: ${r.used_by_email}` : ""}</Badge> : r.revoked_at ? <Badge tone="danger">Ləğv edilib</Badge> : <Badge tone="primary">Aktiv</Badge>}</td>
                  <td className="text-right">{!r.used_at && !r.revoked_at && <Button size="sm" variant="ghost" className="text-danger" onClick={() => revoke(r.id)}>Ləğv et</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Dəvət yoxdur" />}
      <Dialog open={open} onClose={() => setOpen(false)} title="Yeni dəvət kodu" footer={created ? <Button onClick={() => setOpen(false)}>Bağla</Button> : <><Button variant="secondary" onClick={() => setOpen(false)}>Ləğv et</Button><Button onClick={create} loading={loading}>Kod yarat</Button></>}>
        {created ? (
          <div className="space-y-4 text-center">
            <Alert tone="warning">Bu kod yalnız indi göstərilir. Onu təhlükəsiz şəkildə çatdırın.</Alert>
            <p className="select-all font-mono text-2xl font-semibold tracking-widest">{created}</p>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(created).then(() => toast.success("Kopyalandı."))}><Copy className="size-4" aria-hidden="true" /> Kopyala</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {error && <Alert tone="danger" className="sm:col-span-2">{error}</Alert>}
            <FormField id="i-role" label="Rol" required error={fields.role}>
              <Select id="i-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>{roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}</Select>
            </FormField>
            <FormField id="i-days" label="Etibarlılıq (gün)" error={fields.days}><Input id="i-days" type="number" min={1} max={90} value={form.days} onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))} /></FormField>
            {needsStudent && (
              <FormField id="i-student-q" label="Şagird axtar" className="sm:col-span-2">
                <Input id="i-student-q" type="search" value={studentQ} onChange={(e) => setStudentQ(e.target.value)} placeholder="Ad, soyad və ya şagird kodu" autoComplete="off" />
              </FormField>
            )}
            {needsStudent && (
              <FormField id="i-student" label="Şagird" required error={fields.studentId} className="sm:col-span-2">
                <Select id="i-student" value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}><option value="">{students.length ? "Seçin…" : "Nəticə tapılmadı"}</option>{students.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
              </FormField>
            )}
            {form.role === "parent" && (
              <FormField id="i-rel" label="Qohumluq əlaqəsi" error={fields.relationType}>
                <Select id="i-rel" value={form.relationType} onChange={(e) => setForm((f) => ({ ...f, relationType: e.target.value }))}>{["valideyn", "ana", "ata", "qəyyum"].map((x) => <option key={x} value={x}>{x}</option>)}</Select>
              </FormField>
            )}
            {teacherRole && (
              <FormField id="i-teacher" label="Müəllim profili (istəyə bağlı)" error={fields.teacherId} className="sm:col-span-2">
                <Select id="i-teacher" value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}><option value="">—</option>{teachers.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
              </FormField>
            )}
            <FormField id="i-email" label="E-poçt (istəyə bağlı)" hint="Doldurularsa kod yalnız bu e-poçtla istifadə edilə bilər." error={fields.email} className="sm:col-span-2">
              <Input id="i-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </FormField>
          </div>
        )}
      </Dialog>
    </div>
  );
}
