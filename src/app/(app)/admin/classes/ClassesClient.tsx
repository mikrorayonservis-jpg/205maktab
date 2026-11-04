"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, Link2, Pencil, Plus, Users } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

interface ClassRow {
  id: number; name: string; grade_level: number; school_year_id: number; school_year: string; shift: number; room: string | null; is_active: number;
  class_teacher_id: number | null; class_teacher: string | null; student_count: number;
  code: string | null; code_active: number | null; code_uses: number | null; code_max_uses: number | null; code_expires_at: string | null;
}
interface Opt { value: number; label: string }

const emptyForm = { name: "", gradeLevel: "", classTeacherId: "", shift: "1", room: "", maxUses: "", expiresAt: "" };

function codeState(c: ClassRow): { tone: "success" | "warning" | "danger" | "neutral"; label: string } {
  if (!c.code) return { tone: "neutral", label: "Kod yoxdur" };
  if (!c.is_active) return { tone: "neutral", label: "Sinif deaktivdir" };
  if (!c.code_active) return { tone: "danger", label: "Kod deaktivdir" };
  if (c.code_expires_at && new Date(c.code_expires_at.replace(" ", "T") + "+04:00") < new Date()) return { tone: "warning", label: "Müddəti bitib" };
  if (c.code_max_uses && (c.code_uses ?? 0) >= c.code_max_uses) return { tone: "warning", label: "Limit dolub" };
  return { tone: "success", label: "Aktiv" };
}

export function ClassesClient({ canManage, canEnroll }: { canManage: boolean; canEnroll: boolean }) {
  const toast = useToast();
  const [years, setYears] = useState<Opt[]>([]);
  const [yearId, setYearId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [rows, setRows] = useState<ClassRow[] | null>(null);
  const [teachers, setTeachers] = useState<Opt[]>([]);
  const [editing, setEditing] = useState<ClassRow | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState<{ kind: "rotate" | "deactivate" | "activate"; row: ClassRow } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { loading, error, fields, run } = useSubmit();

  useEffect(() => {
    api<Opt[]>("/api/admin/options?source=school_years").then((y) => {
      setYears(y);
      const active = y.find((o) => o.label.includes("(aktiv)")) ?? y[0];
      if (active) setYearId(String(active.value));
    }).catch(() => setYears([]));
    if (canManage) api<Opt[]>("/api/admin/options?source=teachers").then(setTeachers).catch(() => undefined);
  }, [canManage]);

  const load = useCallback(() => {
    if (!yearId) return;
    setRows(null);
    api<ClassRow[]>(`/api/admin/classes?yearId=${yearId}&all=${showInactive ? 1 : 0}`).then(setRows).catch(() => setRows([]));
  }, [yearId, showInactive]);
  useEffect(load, [load]);

  function openEdit(r: ClassRow | "new") {
    setEditing(r);
    setForm(r === "new" ? emptyForm : {
      name: r.name, gradeLevel: String(r.grade_level), classTeacherId: r.class_teacher_id ? String(r.class_teacher_id) : "", shift: String(r.shift), room: r.room ?? "",
      maxUses: r.code_max_uses ? String(r.code_max_uses) : "", expiresAt: r.code_expires_at ? r.code_expires_at.slice(0, 10) : "",
    });
  }

  async function save() {
    const body = { name: form.name, gradeLevel: form.gradeLevel, classTeacherId: form.classTeacherId, shift: Number(form.shift), room: form.room };
    if (editing === "new") {
      const r = await run(() => api<{ code: string }>("/api/admin/classes", { body: { ...body, schoolYearId: yearId } }));
      if (r) { toast.success(`Sinif yaradıldı. Dəvət kodu: ${r.code}`); setEditing(null); load(); }
      return;
    }
    if (!editing) return;
    const ok = await run(async () => {
      await api(`/api/admin/classes/${editing.id}`, { method: "PATCH", body });
      if (editing.code) await api(`/api/admin/classes/${editing.id}/code`, { method: "PATCH", body: { maxUses: form.maxUses, expiresAt: form.expiresAt } });
      return true;
    });
    if (ok) { toast.success("Yadda saxlanıldı."); setEditing(null); load(); }
  }

  async function doConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      const { kind, row } = confirm;
      if (kind === "rotate") {
        const r = await api<{ code: string }>(`/api/admin/classes/${row.id}/code`, { body: { maxUses: row.code_max_uses ?? "", expiresAt: "" } });
        toast.success(`${row.name}: yeni kod ${r.code}. Köhnə kod artıq işləmir.`);
      } else {
        await api(`/api/admin/classes/${row.id}`, { method: "PATCH", body: { isActive: kind === "activate" } });
        toast.success(kind === "activate" ? "Sinif aktivləşdirildi." : "Sinif deaktiv edildi.");
      }
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xəta baş verdi.");
    } finally {
      setBusy(false);
    }
  }

  const missing = rows ? rows.filter((r) => r.is_active && !r.code).length : 0;

  async function createMissing() {
    setBusy(true);
    try {
      const r = await api<{ created: number }>("/api/admin/classes/missing-codes", { body: { yearId: Number(yearId) } });
      toast.success(`${r.created} sinif üçün kod yaradıldı.`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xəta baş verdi.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCode(r: ClassRow) {
    try {
      await api(`/api/admin/classes/${r.id}/code`, { method: "PATCH", body: { isActive: !r.code_active } });
      toast.success(r.code_active ? "Kod deaktiv edildi." : "Kod aktivləşdirildi.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xəta baş verdi.");
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      toast.error("Kopyalamaq alınmadı. Kodu əl ilə seçin.");
    }
  }

  const joinLink = (code: string) => `${window.location.origin}/register?code=${encodeURIComponent(code)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <FormField id="cl-year" label="Tədris ili" className="w-full sm:w-56">
          <Select id="cl-year" value={yearId} onChange={(e) => setYearId(e.target.value)}>
            {years.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
          </Select>
        </FormField>
        <label className="inline-flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Deaktiv sinifləri də göstər
        </label>
        <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          {canEnroll && <Link href="/admin/classes/import" className="inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-sm font-medium hover:bg-surface-2">CSV import</Link>}
          {canEnroll && <Link href="/admin/classes/placement" className="inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-sm font-medium hover:bg-surface-2">Şagird yerləşdirmə</Link>}
          {canManage && <Button onClick={() => openEdit("new")} disabled={!yearId}><Plus className="size-4" aria-hidden="true" /> Yeni sinif</Button>}
        </div>
      </div>

      {!years.length && rows !== null && <Alert tone="warning">Tədris ili yoxdur. Əvvəlcə “Tədris illəri” bölməsində tədris ili yaradın.</Alert>}
      {canManage && missing > 0 && (
        <Alert tone="info" title={`${missing} sinfin dəvət kodu yoxdur`}>
          <span className="block">Bu siniflər kodlar sistemindən əvvəl yaradılıb. Bir düymə ilə hamısına unikal kod yaradın.</span>
          <Button size="sm" className="mt-2" onClick={createMissing} loading={busy && !confirm}>Kodları yarat</Button>
        </Alert>
      )}
      {rows === null ? <Skeleton className="h-64" /> : !rows.length ? (
        <EmptyState title="Bu tədris ilində sinif yoxdur" action={canManage ? <Button size="sm" onClick={() => openEdit("new")}><Plus className="size-4" aria-hidden="true" /> Yeni sinif</Button> : undefined}>
          Sinif yaradılanda onun üçün dəvət kodu avtomatik yaranır.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const st = codeState(r);
            return (
              <li key={r.id} className="flex flex-col rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl font-bold leading-none text-ink">{r.name}</h2>
                    <p className="mt-1.5 text-sm text-ink-3">{r.shift}-ci növbə{r.room ? ` · kabinet ${r.room}` : ""}</p>
                  </div>
                  {!r.is_active && <Badge>Deaktiv</Badge>}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="min-w-0">
                    <dt className="text-ink-3">Şagird</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{r.student_count}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-ink-3">Sinif rəhbəri</dt>
                    <dd className="mt-0.5 break-words font-medium text-ink">{r.class_teacher ?? <span className="text-ink-3">Təyin edilməyib</span>}</dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-md bg-surface-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-ink-3">Dəvət kodu</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  {r.code ? (
                    <>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="min-w-0 flex-1 break-all font-mono text-base font-semibold tracking-wide text-ink">{r.code}</code>
                        <Button size="sm" variant="secondary" onClick={() => copy(r.code!, `c${r.id}`)} aria-label={`${r.name} kodunu kopyala`}>
                          {copied === `c${r.id}` ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => copy(joinLink(r.code!), `l${r.id}`)} aria-label={`${r.name} qoşulma keçidini kopyala`} title="Qoşulma keçidi">
                          {copied === `l${r.id}` ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
                        </Button>
                      </div>
                      <p className="mt-1.5 text-xs text-ink-3">
                        {r.code_uses ?? 0} istifadə{r.code_max_uses ? ` / limit ${r.code_max_uses}` : ""}
                        {r.code_expires_at ? ` · ${formatDate(r.code_expires_at)} tarixinədək` : ""}
                      </p>
                    </>
                  ) : <p className="mt-2 text-sm text-ink-3">Bu sinif üçün kod yoxdur.</p>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                  {canEnroll && (
                    <Link href={`/admin/classes/placement?class=${r.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-primary hover:bg-surface-2">
                      <Users className="size-4" aria-hidden="true" /> Şagirdlər
                    </Link>
                  )}
                  {canManage && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="size-4" aria-hidden="true" /> Redaktə</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "rotate", row: r })} disabled={!r.is_active}><KeyRound className="size-4" aria-hidden="true" /> {r.code ? "Yeni kod" : "Kod yarat"}</Button>
                      {r.code && r.is_active ? <Button size="sm" variant="ghost" onClick={() => toggleCode(r)}>{r.code_active ? "Kodu dayandır" : "Kodu aktivləşdir"}</Button> : null}
                      <Button size="sm" variant="ghost" className={r.is_active ? "text-danger" : undefined} onClick={() => setConfirm({ kind: r.is_active ? "deactivate" : "activate", row: r })}>
                        {r.is_active ? "Deaktiv et" : "Aktivləşdir"}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yeni sinif" : `${editing ? editing.name : ""} — redaktə`}
        description={editing === "new" ? "Sinif yaradılan kimi onun üçün unikal dəvət kodu yaranır." : undefined}
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Ləğv et</Button><Button onClick={save} loading={loading}>Yadda saxla</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {error && <Alert tone="danger" className="sm:col-span-2">{error}</Alert>}
          <FormField id="cf-name" label="Sinif adı" required error={fields.name} hint="Məs. 5-A, 10-B">
            <Input id="cf-name" value={form.name} maxLength={20} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField id="cf-grade" label="Səviyyə" error={fields.gradeLevel} hint="Boş qalsa addan götürülür">
            <Input id="cf-grade" type="number" min={1} max={12} inputMode="numeric" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} />
          </FormField>
          <FormField id="cf-teacher" label="Sinif rəhbəri" error={fields.classTeacherId} className="sm:col-span-2">
            <Select id="cf-teacher" value={form.classTeacherId} onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}>
              <option value="">Təyin edilməyib</option>
              {teachers.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </FormField>
          <FormField id="cf-shift" label="Növbə">
            <Select id="cf-shift" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
              <option value="1">I növbə</option><option value="2">II növbə</option>
            </Select>
          </FormField>
          <FormField id="cf-room" label="Kabinet" error={fields.room}>
            <Input id="cf-room" value={form.room} maxLength={20} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          </FormField>
          {editing && editing !== "new" && editing.code && (
            <>
              <p className="text-sm font-medium text-ink sm:col-span-2">Dəvət kodunun məhdudiyyətləri</p>
              <FormField id="cf-max" label="İstifadə limiti" error={fields.maxUses} hint="Boş — limitsiz">
                <Input id="cf-max" type="number" min={1} inputMode="numeric" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
              </FormField>
              <FormField id="cf-exp" label="Son istifadə tarixi" error={fields.expiresAt} hint="Boş — müddətsiz">
                <Input id="cf-exp" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </FormField>
            </>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        loading={busy}
        danger={confirm?.kind === "deactivate"}
        title={confirm?.kind === "rotate" ? "Yeni dəvət kodu" : confirm?.kind === "deactivate" ? "Sinfi deaktiv etmək" : "Sinfi aktivləşdirmək"}
        confirmLabel={confirm?.kind === "rotate" ? "Yeni kod yarat" : confirm?.kind === "deactivate" ? "Deaktiv et" : "Aktivləşdir"}
        message={
          confirm?.kind === "rotate"
            ? `${confirm.row.name} üçün yeni kod yaradılacaq. Köhnə kod dərhal işləməyi dayandıracaq; artıq qoşulmuş şagirdlər sinifdə qalır.`
            : confirm?.kind === "deactivate"
              ? `${confirm.row.name} deaktiv ediləcək: bu sinfə kodla qoşulmaq və şagird köçürmək mümkün olmayacaq. Mövcud şagirdlər, qiymətlər və davamiyyət silinmir.`
              : `${confirm?.row.name} yenidən aktiv olacaq.`
        }
      />
    </div>
  );
}
