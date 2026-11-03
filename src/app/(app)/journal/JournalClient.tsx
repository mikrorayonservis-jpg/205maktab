"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { addDays, formatDate, todayBaku } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

const TYPES: Record<string, string> = { formativ: "Formativ", ksq: "KSQ", bsq: "BSQ", ev: "Ev tapşırığı", layihe: "Layihə", yekun: "Yekun" };

interface Assignment { class_id: number; class_name: string; subject_id: number; subject_name: string }
interface Student { id: number; first_name: string; last_name: string }
interface Grade { id: number; student_id: number; date: string; grade_value: number; grade_type: string; note: string | null }
interface Opt { value: string; label: string }

function tone(v: number) {
  return v >= 5 ? "success" : v === 4 ? "primary" : v === 3 ? "warning" : "danger";
}

export function JournalClient({ initialClass, initialSubject, canBrowseAll }: { initialClass: number | null; initialSubject: number | null; canBrowseAll: boolean }) {
  const toast = useToast();
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [classes, setClasses] = useState<Opt[]>([]);
  const [subjects, setSubjects] = useState<Opt[]>([]);
  const [classId, setClassId] = useState<number | null>(initialClass);
  const [subjectId, setSubjectId] = useState<number | null>(initialSubject);
  const [from, setFrom] = useState(addDays(todayBaku(), -30));
  const [to, setTo] = useState(todayBaku());
  const [sheet, setSheet] = useState<{ students: Student[]; grades: Grade[]; canEdit: boolean } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [edit, setEdit] = useState<Grade | null>(null);

  useEffect(() => {
    api<{ assignments: Assignment[] }>("/api/teacher/assignments").then((r) => {
      setAssignments(r.assignments);
      if (!initialClass && r.assignments[0]) {
        setClassId(r.assignments[0].class_id);
        setSubjectId(r.assignments[0].subject_id);
      }
    }).catch(() => setAssignments([]));
    if (canBrowseAll) {
      api<Opt[]>("/api/admin/options?source=classes").then(setClasses).catch(() => undefined);
      api<Opt[]>("/api/admin/options?source=subjects").then(setSubjects).catch(() => undefined);
    }
  }, [canBrowseAll, initialClass]);

  const load = useCallback(() => {
    if (!classId || !subjectId) return;
    setLoadErr(null);
    setSheet(null);
    api<{ students: Student[]; grades: Grade[]; canEdit: boolean }>(`/api/journal?classId=${classId}&subjectId=${subjectId}&from=${from}&to=${to}`)
      .then(setSheet)
      .catch((e) => setLoadErr(e.message));
  }, [classId, subjectId, from, to]);
  useEffect(load, [load]);

  const dates = useMemo(() => [...new Set((sheet?.grades || []).map((g) => g.date))].sort(), [sheet]);
  const byKey = useMemo(() => {
    const m = new Map<string, Grade[]>();
    for (const g of sheet?.grades || []) m.set(`${g.student_id}|${g.date}`, [...(m.get(`${g.student_id}|${g.date}`) || []), g]);
    return m;
  }, [sheet]);

  const pairOptions = (assignments || []).map((a) => ({ value: `${a.class_id}:${a.subject_id}`, label: `${a.class_name} · ${a.subject_name}` }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
        {pairOptions.length > 0 && (
          <FormField id="pair" label="Sinif və fənn" className="min-w-64">
            <Select id="pair" value={classId && subjectId ? `${classId}:${subjectId}` : ""} onChange={(e) => { const [c, s] = e.target.value.split(":").map(Number); setClassId(c || null); setSubjectId(s || null); }}>
              <option value="">Seçin…</option>
              {pairOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </FormField>
        )}
        {canBrowseAll && (
          <>
            <FormField id="cls" label="Sinif" className="min-w-40">
              <Select id="cls" value={classId ?? ""} onChange={(e) => setClassId(Number(e.target.value) || null)}>
                <option value="">Seçin…</option>
                {classes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </FormField>
            <FormField id="sub" label="Fənn" className="min-w-40">
              <Select id="sub" value={subjectId ?? ""} onChange={(e) => setSubjectId(Number(e.target.value) || null)}>
                <option value="">Seçin…</option>
                {subjects.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </FormField>
          </>
        )}
        <FormField id="from" label="Başlanğıc"><Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></FormField>
        <FormField id="to" label="Son"><Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></FormField>
        {sheet?.canEdit && <Button onClick={() => setNewOpen(true)} className="ml-auto"><Plus className="size-4" aria-hidden="true" /> Qiymət yaz</Button>}
      </div>

      {assignments && !assignments.length && !canBrowseAll && <EmptyState title="Sizə hələ sinif və fənn təyin edilməyib">Təyinat üçün direktor müavininə müraciət edin.</EmptyState>}
      {loadErr && <Alert tone="danger">{loadErr}</Alert>}
      {classId && subjectId && !sheet && !loadErr && <Skeleton className="h-64 w-full" />}
      {sheet && (
        sheet.students.length ? (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="table-base">
              <caption className="sr-only">Jurnal vərəqi</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 min-w-48 bg-surface-2">Şagird</th>
                  {dates.map((d) => <th key={d} scope="col" className="text-center tabular-nums">{formatDate(d).slice(0, 5)}</th>)}
                  <th scope="col" className="text-center">Orta</th>
                </tr>
              </thead>
              <tbody>
                {sheet.students.map((s, i) => {
                  const all = sheet.grades.filter((g) => g.student_id === s.id);
                  const avg = all.length ? all.reduce((a, g) => a + g.grade_value, 0) / all.length : null;
                  return (
                    <tr key={s.id}>
                      <th scope="row" className="sticky left-0 z-10 bg-surface text-left font-normal"><span className="mr-2 text-ink-3 tabular-nums">{i + 1}.</span>{s.last_name} {s.first_name}</th>
                      {dates.map((d) => (
                        <td key={d} className="text-center">
                          <div className="flex justify-center gap-1">
                            {(byKey.get(`${s.id}|${d}`) || []).map((g) => (
                              <button key={g.id} type="button" disabled={!sheet.canEdit} onClick={() => setEdit(g)} title={`${TYPES[g.grade_type]}${g.note ? ` — ${g.note}` : ""}`} aria-label={`${s.first_name} ${s.last_name}, ${formatDate(d)}: ${g.grade_value} (${TYPES[g.grade_type]})`}>
                                <Badge tone={tone(g.grade_value)} className="min-w-7 justify-center text-sm">{g.grade_value}{g.grade_type !== "formativ" && <sup className="ml-0.5 text-[9px] uppercase">{g.grade_type.slice(0, 1)}</sup>}</Badge>
                              </button>
                            ))}
                          </div>
                        </td>
                      ))}
                      <td className="text-center font-semibold tabular-nums">{avg ? avg.toFixed(2).replace(".", ",") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Bu sinifdə şagird yoxdur" />
        )
      )}
      {sheet && classId && subjectId && (
        <NewGradesDialog open={newOpen} onClose={() => setNewOpen(false)} students={sheet.students} classId={classId} subjectId={subjectId} onSaved={() => { setNewOpen(false); toast.success("Qiymətlər yazıldı."); load(); }} />
      )}
      {edit && <EditGradeDialog grade={edit} onClose={() => setEdit(null)} onSaved={(m) => { setEdit(null); toast.success(m); load(); }} />}
    </div>
  );
}

function NewGradesDialog({ open, onClose, students, classId, subjectId, onSaved }: { open: boolean; onClose: () => void; students: Student[]; classId: number; subjectId: number; onSaved: () => void }) {
  const [date, setDate] = useState(todayBaku());
  const [type, setType] = useState("formativ");
  const [values, setValues] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const { loading, error, fields, run } = useSubmit();
  async function save() {
    const entries = students.filter((s) => values[s.id]).map((s) => ({ studentId: s.id, value: Number(values[s.id]), note: notes[s.id] || null }));
    if (!entries.length) return;
    const r = await run(() => api("/api/grades", { body: { classId, subjectId, date, type, entries } }));
    if (r) {
      setValues({});
      setNotes({});
      onSaved();
    }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Qiymət yaz" size="lg" footer={<><Button variant="secondary" onClick={onClose}>Ləğv et</Button><Button onClick={save} loading={loading}>Yadda saxla</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="danger">{error}{Object.values(fields).length > 0 && <ul className="mt-1 list-disc pl-4">{Object.entries(fields).map(([k, v]) => <li key={k}>{v}</li>)}</ul>}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="g-date" label="Tarix" required><Input id="g-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayBaku()} /></FormField>
          <FormField id="g-type" label="Qiymətləndirmə növü" required>
            <Select id="g-type" value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          </FormField>
        </div>
        <table className="table-base">
          <thead><tr><th scope="col">Şagird</th><th scope="col" className="w-28">Qiymət</th><th scope="col">Qeyd</th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.last_name} {s.first_name}</td>
                <td>
                  <Select aria-label={`${s.first_name} ${s.last_name} — qiymət`} value={values[s.id] || ""} onChange={(e) => setValues((v) => ({ ...v, [s.id]: e.target.value }))} className="h-9">
                    <option value="">—</option>{[5, 4, 3, 2].map((n) => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </td>
                <td><Input aria-label={`${s.first_name} ${s.last_name} — qeyd`} value={notes[s.id] || ""} onChange={(e) => setNotes((v) => ({ ...v, [s.id]: e.target.value }))} className="h-9" maxLength={255} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

function EditGradeDialog({ grade, onClose, onSaved }: { grade: Grade; onClose: () => void; onSaved: (msg: string) => void }) {
  const [value, setValue] = useState(String(grade.grade_value));
  const [type, setType] = useState(grade.grade_type);
  const [note, setNote] = useState(grade.note || "");
  const [confirm, setConfirm] = useState(false);
  const { loading, error, run } = useSubmit();
  async function save() {
    const r = await run(() => api(`/api/grades/${grade.id}`, { method: "PATCH", body: { value: Number(value), type, note: note || null } }));
    if (r) onSaved("Qiymət düzəldildi.");
  }
  async function remove() {
    const r = await run(() => api(`/api/grades/${grade.id}`, { method: "DELETE" }));
    if (r) onSaved("Qiymət silindi.");
  }
  return (
    <>
      <Dialog open onClose={onClose} title={`Qiyməti düzəlt — ${formatDate(grade.date)}`} size="sm" footer={<><Button variant="danger" onClick={() => setConfirm(true)} className="mr-auto"><Trash2 className="size-4" aria-hidden="true" /> Sil</Button><Button variant="secondary" onClick={onClose}>Ləğv et</Button><Button onClick={save} loading={loading}>Yadda saxla</Button></>}>
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <FormField id="e-val" label="Qiymət"><Select id="e-val" value={value} onChange={(e) => setValue(e.target.value)}>{[5, 4, 3, 2].map((n) => <option key={n} value={n}>{n}</option>)}</Select></FormField>
          <FormField id="e-type" label="Növ"><Select id="e-type" value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></FormField>
          <FormField id="e-note" label="Qeyd (düzəlişin səbəbi)"><Input id="e-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} /></FormField>
        </div>
      </Dialog>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => { setConfirm(false); remove(); }} title="Qiyməti silmək?" message="Qiymət jurnaldan silinəcək, lakin audit tarixçəsində qalacaq." confirmLabel="Sil" danger />
    </>
  );
}
