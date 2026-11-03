"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { WEEKDAYS_AZ } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Alert, Card } from "@/components/ui/Feedback";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

interface Lesson { id: number; class_id: number; subject_id: number; subject_name: string; teacher_id: number; teacher_name: string; day_of_week: number; period: number; start_time: string; end_time: string; room: string | null }
interface Opt { id: number; name: string }
interface Bell { shift: number; period: number; start_time: string; end_time: string }
interface Conflict { a_id: number; b_id: number; teacher_name: string; day_of_week: number; class_a: string; class_b: string; start_a: string }

export function ScheduleEditor({ classes, teachers, subjects, bells }: { classes: (Opt & { shift: number; room: string | null })[]; teachers: Opt[]; subjects: Opt[]; bells: Bell[] }) {
  const toast = useToast();
  const [classId, setClassId] = useState(classes[0]?.id ?? 0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [cell, setCell] = useState<{ day: number; period: number; lesson?: Lesson } | null>(null);
  const cls = classes.find((c) => c.id === classId);
  const shiftBells = bells.filter((b) => b.shift === (cls?.shift ?? 1));
  const periods = shiftBells.length ? shiftBells.map((b) => b.period) : [1, 2, 3, 4, 5, 6];
  const load = useCallback(() => {
    if (!classId) return;
    api<Lesson[]>(`/api/schedule?classId=${classId}`).then(setLessons).catch(() => setLessons([]));
    api<Conflict[]>("/api/schedule/conflicts").then(setConflicts).catch(() => undefined);
  }, [classId]);
  useEffect(load, [load]);

  if (!classes.length) return <Alert tone="info">Əvvəlcə aktiv tədris ili üçün siniflər yaradın.</Alert>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <FormField id="se-class" label="Sinif" className="min-w-48"><Select id="se-class" value={classId} onChange={(e) => setClassId(Number(e.target.value))}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.shift}-ci növbə)</option>)}</Select></FormField>
      </div>
      {conflicts.length > 0 && (
        <Alert tone="danger" title={`${conflicts.length} müəllim konflikti aşkarlandı`}>
          <ul className="list-disc pl-4">{conflicts.slice(0, 8).map((c) => <li key={`${c.a_id}-${c.b_id}`}>{c.teacher_name}: {WEEKDAYS_AZ[c.day_of_week - 1]}, {c.start_a} — {c.class_a} və {c.class_b}</li>)}</ul>
        </Alert>
      )}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="table-base table-fixed">
          <thead><tr><th scope="col" className="w-20">Dərs</th>{[1, 2, 3, 4, 5].map((d) => <th key={d} scope="col">{WEEKDAYS_AZ[d - 1]}</th>)}</tr></thead>
          <tbody>
            {periods.map((p) => {
              const bell = shiftBells.find((b) => b.period === p);
              return (
                <tr key={p}>
                  <th scope="row" className="align-middle"><span className="block font-semibold">{p}</span>{bell && <span className="text-[11px] font-normal text-ink-3">{bell.start_time}</span>}</th>
                  {[1, 2, 3, 4, 5].map((d) => {
                    const l = lessons.find((x) => x.day_of_week === d && x.period === p);
                    const bad = l && conflicts.some((c) => c.a_id === l.id || c.b_id === l.id);
                    return (
                      <td key={d} className="h-16 p-1">
                        <button type="button" onClick={() => setCell({ day: d, period: p, lesson: l })} className={`h-full w-full rounded-md border px-2 py-1 text-left text-xs ${l ? (bad ? "border-danger bg-danger-soft" : "border-primary/30 bg-primary-soft/60") : "border-dashed border-line text-ink-3 hover:bg-surface-2"}`} aria-label={`${WEEKDAYS_AZ[d - 1]}, ${p}-ci dərs: ${l ? `${l.subject_name}, ${l.teacher_name}` : "boş, əlavə et"}`}>
                          {l ? (<><span className="block font-medium text-ink">{l.subject_name}</span><span className="block text-ink-3">{l.teacher_name}{l.room ? ` · ${l.room}` : ""}</span>{bad && <AlertTriangle className="size-3 text-danger" aria-hidden="true" />}</>) : "+"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {cell && cls && <LessonDialog cell={cell} classId={classId} defaultRoom={cls.room} bell={shiftBells.find((b) => b.period === cell.period)} teachers={teachers} subjects={subjects} onClose={() => setCell(null)} onSaved={(m) => { setCell(null); toast.success(m); load(); }} />}
      <Card className="p-4 text-xs text-ink-3">Boş xanaya klikləyərək dərs əlavə edin; mövcud dərsə klikləyərək dəyişin və ya silin. Saxlama zamanı müəllim, sinif və kabinet üst-üstə düşmələri serverdə yoxlanılır.</Card>
    </div>
  );
}

function LessonDialog({ cell, classId, defaultRoom, bell, teachers, subjects, onClose, onSaved }: { cell: { day: number; period: number; lesson?: Lesson }; classId: number; defaultRoom: string | null; bell?: Bell; teachers: Opt[]; subjects: Opt[]; onClose: () => void; onSaved: (m: string) => void }) {
  const l = cell.lesson;
  const [f, setF] = useState({ subjectId: String(l?.subject_id ?? ""), teacherId: String(l?.teacher_id ?? ""), startTime: l?.start_time ?? bell?.start_time ?? "08:00", endTime: l?.end_time ?? bell?.end_time ?? "08:45", room: l?.room ?? defaultRoom ?? "" });
  const { loading, error, fields, run } = useSubmit();
  async function save() {
    const body = { classId, subjectId: Number(f.subjectId), teacherId: Number(f.teacherId), dayOfWeek: cell.day, period: cell.period, startTime: f.startTime, endTime: f.endTime, room: f.room || null };
    const r = await run(() => (l ? api(`/api/schedule/lessons/${l.id}`, { method: "PATCH", body }) : api("/api/schedule/lessons", { body })));
    if (r) onSaved(l ? "Dərs yeniləndi." : "Dərs əlavə edildi.");
  }
  async function remove() {
    if (!l) return;
    const r = await run(() => api(`/api/schedule/lessons/${l.id}`, { method: "DELETE" }));
    if (r) onSaved("Dərs silindi.");
  }
  return (
    <Dialog open onClose={onClose} title={`${WEEKDAYS_AZ[cell.day - 1]}, ${cell.period}-ci dərs`} footer={<>{l && <Button variant="danger" className="mr-auto" onClick={remove}><Trash2 className="size-4" aria-hidden="true" /> Sil</Button>}<Button variant="secondary" onClick={onClose}>Ləğv et</Button><Button onClick={save} loading={loading}>Yadda saxla</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {error && <Alert tone="danger" className="sm:col-span-2">{error}</Alert>}
        <FormField id="l-sub" label="Fənn" required error={fields.subjectId}><Select id="l-sub" value={f.subjectId} onChange={(e) => setF((x) => ({ ...x, subjectId: e.target.value }))}><option value="">Seçin…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FormField>
        <FormField id="l-t" label="Müəllim" required error={fields.teacherId}><Select id="l-t" value={f.teacherId} onChange={(e) => setF((x) => ({ ...x, teacherId: e.target.value }))}><option value="">Seçin…</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></FormField>
        <FormField id="l-s" label="Başlama" error={fields.startTime}><Input id="l-s" type="time" value={f.startTime} onChange={(e) => setF((x) => ({ ...x, startTime: e.target.value }))} /></FormField>
        <FormField id="l-e" label="Bitmə" error={fields.endTime}><Input id="l-e" type="time" value={f.endTime} onChange={(e) => setF((x) => ({ ...x, endTime: e.target.value }))} /></FormField>
        <FormField id="l-r" label="Kabinet" error={fields.room}><Input id="l-r" value={f.room} onChange={(e) => setF((x) => ({ ...x, room: e.target.value }))} maxLength={20} /></FormField>
      </div>
    </Dialog>
  );
}
