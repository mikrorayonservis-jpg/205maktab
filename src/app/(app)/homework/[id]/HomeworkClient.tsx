"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormField, Select, Textarea } from "@/components/ui/Field";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/Feedback";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { FileChip, FileUpload, type Uploaded } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";
import { HomeworkForm } from "@/components/app/HomeworkForm";

export function HomeworkActions({ id, initial }: { id: number; initial: Parameters<typeof HomeworkForm>[0]["initial"] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  async function remove() {
    await api(`/api/homework/${id}`, { method: "DELETE" }).then(() => { toast.success("Tapşırıq silindi."); router.push("/homework"); }).catch((e) => toast.error(e.message));
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="size-4" aria-hidden="true" /> Redaktə</Button>
      <Button variant="danger" onClick={() => setConfirm(true)}><Trash2 className="size-4" aria-hidden="true" /> Sil</Button>
      <Dialog open={editing} onClose={() => setEditing(false)} title="Tapşırığı redaktə et" size="lg"><HomeworkForm initial={initial} /></Dialog>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} title="Tapşırığı silmək?" message="Tapşırıq şagirdlərin siyahısından çıxarılacaq." confirmLabel="Sil" danger />
    </>
  );
}

export function SubmitForm({ hwId, initialAnswer, overdue }: { hwId: number; initialAnswer: string; overdue: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [file, setFile] = useState<Uploaded | null>(null);
  const { loading, error, fields, run } = useSubmit();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const answer = String(new FormData(e.currentTarget).get("answer") || "");
    const r = await run(() => api(`/api/homework/${hwId}/submissions`, { body: { answer, fileId: file?.id ?? null } }));
    if (r) {
      toast.success("Cavab göndərildi.");
      router.refresh();
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {overdue && <Alert tone="warning">Son tarix keçib. Cavab gecikmiş kimi qeyd olunacaq.</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      <FormField id="answer" label="Cavab mətni" error={fields.answer}><Textarea id="answer" name="answer" rows={6} defaultValue={initialAnswer} maxLength={10000} /></FormField>
      <div className="flex flex-wrap items-center gap-2">
        {file ? <FileChip name={file.originalName} onRemove={() => setFile(null)} /> : <FileUpload purpose="submission" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx" onUploaded={setFile} label="Fayl əlavə et" />}
      </div>
      <Button type="submit" loading={loading}>Göndər</Button>
    </form>
  );
}

interface Sub { student_id: number; student_name: string; id: number | null; answer_text: string | null; file_id: number | null; file_name: string | null; submitted_at: string | null; grade: number | null; feedback: string | null; status: string | null; is_late: number | null }

export function SubmissionsReview({ hwId, canGrade }: { hwId: number; canGrade: boolean }) {
  const toast = useToast();
  const [rows, setRows] = useState<Sub[] | null>(null);
  const [current, setCurrent] = useState<Sub | null>(null);
  const load = useCallback(() => { api<Sub[]>(`/api/homework/${hwId}/submissions`).then(setRows).catch(() => setRows([])); }, [hwId]);
  useEffect(load, [load]);
  const submitted = rows?.filter((r) => r.id).length ?? 0;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-4">
        <h2 className="text-lg font-semibold">Şagird cavabları</h2>
        {rows && <span className="text-sm text-ink-3">{submitted} / {rows.length} göndərib</span>}
      </div>
      {!rows ? <Skeleton className="m-4 h-40" /> : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th scope="col">Şagird</th><th scope="col">Vəziyyət</th><th scope="col">Göndərilib</th><th scope="col">Qiymət</th><th scope="col"><span className="sr-only">Əməliyyat</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id}>
                  <td>{r.student_name}</td>
                  <td>{r.id ? <Badge tone={r.status === "graded" ? "success" : r.status === "returned" ? "warning" : "primary"}>{r.status === "graded" ? "Qiymətləndirilib" : r.status === "returned" ? "Qaytarılıb" : "Göndərilib"}</Badge> : <Badge>Göndərməyib</Badge>}{r.is_late ? <Badge tone="danger" className="ml-1">Gecikmə</Badge> : null}</td>
                  <td className="tabular-nums text-ink-3">{r.submitted_at ? formatDateTime(r.submitted_at) : "—"}</td>
                  <td className="font-semibold">{r.grade ?? "—"}</td>
                  <td className="text-right">{r.id && <Button size="sm" variant="secondary" onClick={() => setCurrent(r)}>{canGrade ? "Bax / qiymətləndir" : "Bax"}</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {current && <GradeDialog sub={current} canGrade={canGrade} onClose={() => setCurrent(null)} onSaved={() => { setCurrent(null); toast.success("Yadda saxlanıldı."); load(); }} />}
    </Card>
  );
}

function GradeDialog({ sub, canGrade, onClose, onSaved }: { sub: Sub; canGrade: boolean; onClose: () => void; onSaved: () => void }) {
  const [grade, setGrade] = useState(sub.grade ? String(sub.grade) : "");
  const [feedback, setFeedback] = useState(sub.feedback || "");
  const { loading, error, run } = useSubmit();
  async function save(status: "graded" | "returned") {
    const r = await run(() => api(`/api/homework/submissions/${sub.id}`, { method: "PATCH", body: { grade: status === "graded" && grade ? Number(grade) : null, feedback: feedback || null, status } }));
    if (r) onSaved();
  }
  return (
    <Dialog open onClose={onClose} title={sub.student_name} size="lg" footer={canGrade ? <><Button variant="secondary" onClick={() => save("returned")} loading={loading}>Düzəliş üçün qaytar</Button><Button onClick={() => save("graded")} loading={loading}>Qiymətləndir</Button></> : undefined}>
      <div className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        {sub.answer_text ? <p className="whitespace-pre-line rounded-md bg-surface-2 p-3 text-sm">{sub.answer_text}</p> : <p className="text-sm text-ink-3">Mətn cavabı yoxdur.</p>}
        {sub.file_id && <FileChip name={sub.file_name || "Fayl"} href={`/api/files/${sub.file_id}`} />}
        {canGrade && (
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <FormField id="sg" label="Qiymət"><Select id="sg" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">—</option>{[5, 4, 3, 2].map((n) => <option key={n} value={n}>{n}</option>)}</Select></FormField>
            <FormField id="sf" label="Rəy"><Textarea id="sf" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} maxLength={5000} /></FormField>
          </div>
        )}
        {!canGrade && sub.feedback && <p className="text-sm"><strong>Rəy:</strong> {sub.feedback}</p>}
      </div>
    </Dialog>
  );
}
