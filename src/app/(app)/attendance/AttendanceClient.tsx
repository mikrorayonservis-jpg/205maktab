"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { addDays, todayBaku } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

type Status = "present" | "late" | "excused" | "unexcused";
const LABEL: Record<Status, string> = { present: "İştirak", late: "Gecikdi", excused: "Üzrlü", unexcused: "Üzrsüz" };
const STYLE: Record<Status, string> = {
  present: "border-success bg-success-soft text-success",
  late: "border-warning bg-warning-soft text-warning",
  excused: "border-primary bg-primary-soft text-primary",
  unexcused: "border-danger bg-danger-soft text-danger",
};

interface Opt { value: string; label: string }
interface Row { id: number; first_name: string; last_name: string; status: Status | null; note: string | null }

export function AttendanceClient({ canBrowseAll }: { canBrowseAll: boolean }) {
  const toast = useToast();
  const [classes, setClasses] = useState<Opt[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [date, setDate] = useState(todayBaku());
  const [period, setPeriod] = useState("0");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [state, setState] = useState<Record<number, { status: Status; note: string }>>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { loading, error, run } = useSubmit();
  const [report, setReport] = useState<{ student_id: number; student_name: string; present: number; late: number; excused: number; unexcused: number }[] | null>(null);

  useEffect(() => {
    api<{ assignments: { class_id: number; class_name: string }[]; homeroom: { id: number; name: string }[] }>("/api/teacher/assignments").then(async (r) => {
      const map = new Map<string, string>();
      r.homeroom.forEach((h) => map.set(String(h.id), `${h.name} (sinif rəhbəri)`));
      r.assignments.forEach((a) => !map.has(String(a.class_id)) && map.set(String(a.class_id), a.class_name));
      let opts = [...map.entries()].map(([value, label]) => ({ value, label }));
      if (canBrowseAll) opts = await api<Opt[]>("/api/admin/options?source=classes").catch(() => opts);
      setClasses(opts);
      if (opts[0]) setClassId(opts[0].value);
    }).catch(() => setClasses([]));
  }, [canBrowseAll]);

  const load = useCallback(() => {
    if (!classId) return;
    setRows(null);
    setLoadErr(null);
    api<{ students: Row[] }>(`/api/attendance?classId=${classId}&date=${date}&period=${period}`)
      .then((r) => {
        setRows(r.students);
        setState(Object.fromEntries(r.students.map((s) => [s.id, { status: s.status || "present", note: s.note || "" }])));
      })
      .catch((e) => setLoadErr(e.message));
  }, [classId, date, period]);
  useEffect(load, [load]);

  async function save() {
    if (!rows) return;
    const entries = rows.map((s) => ({ studentId: s.id, status: state[s.id]?.status || "present", note: state[s.id]?.note || null }));
    const r = await run(() => api("/api/attendance", { body: { classId: Number(classId), date, period: Number(period), entries } }));
    if (r) {
      toast.success("Davamiyyət yadda saxlanıldı.");
      load();
    }
  }

  async function loadReport() {
    const to = todayBaku();
    setReport(null);
    api<typeof report>(`/api/attendance/report?classId=${classId}&from=${addDays(to, -30)}&to=${to}`).then(setReport).catch((e) => toast.error(e.message));
  }

  if (!classes.length) return <EmptyState title="Sizə sinif təyin edilməyib" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
        <FormField id="a-class" label="Sinif" className="min-w-48">
          <Select id="a-class" value={classId} onChange={(e) => setClassId(e.target.value)}>{classes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
        </FormField>
        <FormField id="a-date" label="Tarix"><Input id="a-date" type="date" value={date} max={todayBaku()} onChange={(e) => setDate(e.target.value)} /></FormField>
        <FormField id="a-period" label="Dərs" className="min-w-40">
          <Select id="a-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="0">Gündəlik (sinif rəhbəri)</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => <option key={p} value={p}>{p}-ci dərs</option>)}
          </Select>
        </FormField>
        <Button variant="secondary" onClick={loadReport} className="ml-auto">30 günlük hesabat</Button>
      </div>
      {loadErr && <Alert tone="warning">{loadErr}</Alert>}
      {!rows && !loadErr && <Skeleton className="h-64 w-full" />}
      {rows && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <Button size="sm" variant="ghost" onClick={() => setState((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { ...v, status: "present" as Status }])))}>Hamı iştirak edir</Button>
            <Button size="sm" onClick={save} loading={loading} className="ml-auto">Yadda saxla</Button>
          </div>
          {error && <Alert tone="danger" className="m-3">{error}</Alert>}
          <ul className="divide-y divide-line">
            {rows.map((s, i) => (
              <li key={s.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
                <span className="md:w-64"><span className="mr-2 text-ink-3 tabular-nums">{i + 1}.</span>{s.last_name} {s.first_name}</span>
                <fieldset className="flex flex-wrap gap-1.5">
                  <legend className="sr-only">{s.first_name} {s.last_name} — status</legend>
                  {(Object.keys(LABEL) as Status[]).map((st) => (
                    <label key={st} className={cn("cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium", state[s.id]?.status === st ? STYLE[st] : "border-line text-ink-2 hover:bg-surface-2")}>
                      <input type="radio" name={`st-${s.id}`} value={st} checked={state[s.id]?.status === st} onChange={() => setState((x) => ({ ...x, [s.id]: { ...x[s.id], status: st } }))} className="sr-only" />
                      {LABEL[st]}
                    </label>
                  ))}
                </fieldset>
                <Input aria-label={`${s.first_name} ${s.last_name} — qeyd`} placeholder="Qeyd" value={state[s.id]?.note || ""} onChange={(e) => setState((x) => ({ ...x, [s.id]: { ...x[s.id], note: e.target.value } }))} className="h-8 md:ml-auto md:w-56" maxLength={255} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {report && (
        <Card className="overflow-hidden">
          <h2 className="border-b border-line p-4 text-lg font-semibold">Son 30 gün üzrə hesabat</h2>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th scope="col">Şagird</th><th scope="col" className="text-right">İştirak</th><th scope="col" className="text-right">Gecikmə</th><th scope="col" className="text-right">Üzrlü</th><th scope="col" className="text-right">Üzrsüz</th></tr></thead>
              <tbody>{report.map((r) => <tr key={r.student_id}><td>{r.student_name}</td><td className="text-right tabular-nums">{r.present}</td><td className="text-right tabular-nums">{r.late}</td><td className="text-right tabular-nums">{r.excused}</td><td className={cn("text-right tabular-nums", r.unexcused > 0 && "font-semibold text-danger")}>{r.unexcused}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
