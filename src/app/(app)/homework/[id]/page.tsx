import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { formatDate, formatDateTime, todayBaku } from "@/lib/format";
import { getHomework } from "@/server/homework";
import { Badge, Card, PageHeader } from "@/components/ui/Feedback";
import { FileChip } from "@/components/ui/FileUpload";
import { HomeworkActions, SubmissionsReview, SubmitForm } from "./HomeworkClient";

export const metadata: Metadata = { title: "Ev tapşırığı" };

export default async function HomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requirePageUser(`/homework/${id}`);
  const hwId = Number(id);
  if (!Number.isInteger(hwId) || hwId <= 0) notFound();
  const data = await getHomework(u, hwId).catch(() => null);
  if (!data) notFound();
  const hw = data.homework;
  const overdue = hw.due_date < todayBaku();
  const mySub = (data.mySubmissions as Array<Record<string, any>>)[0];
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow={`${hw.subject_name} · ${hw.class_name}`}
        title={hw.title}
        description={<>Müəllim: {hw.teacher_name} · Son tarix: <strong className={overdue ? "text-danger" : "text-ink"}>{formatDate(hw.due_date)}</strong></>}
        actions={data.canManage && <HomeworkActions id={hw.id} initial={{ id: hw.id, title: hw.title, description: hw.description, class_id: hw.class_id, subject_id: hw.subject_id, due_date: hw.due_date }} />}
      />
      <Card className="p-6">
        {hw.description ? <p className="whitespace-pre-line leading-relaxed">{hw.description}</p> : <p className="text-ink-3">Təsvir yoxdur.</p>}
        {data.files.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{data.files.map((f) => <FileChip key={f.id} name={f.name} href={f.url} />)}</div>}
      </Card>
      {(data.mySubmissions as Array<Record<string, any>>).length > 0 && !data.canSubmit && (
        <Card className="p-6">
          <h2 className="mb-3 text-lg font-semibold">Uşağın cavabı</h2>
          {(data.mySubmissions as Array<Record<string, any>>).map((s) => (
            <div key={s.id} className="space-y-1 text-sm">
              <p>Göndərilib: {formatDateTime(s.submitted_at)} {s.grade && <Badge tone="success">Qiymət: {s.grade}</Badge>}</p>
              {s.answer_text && <p className="whitespace-pre-line text-ink-2">{s.answer_text}</p>}
              {s.feedback && <p className="text-ink-2"><strong>Müəllimin rəyi:</strong> {s.feedback}</p>}
            </div>
          ))}
        </Card>
      )}
      {data.canSubmit && (
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-semibold">Cavabım</h2>
          {mySub && (
            <div className="mb-4 space-y-1 text-sm text-ink-2">
              <p>Son göndəriş: {formatDateTime(mySub.submitted_at)} · <Badge tone={mySub.status === "graded" ? "success" : mySub.status === "returned" ? "warning" : "primary"}>{mySub.status === "graded" ? `Qiymətləndirilib: ${mySub.grade ?? "—"}` : mySub.status === "returned" ? "Düzəliş üçün qaytarılıb" : "Göndərilib"}</Badge></p>
              {mySub.feedback && <p><strong>Müəllimin rəyi:</strong> {mySub.feedback}</p>}
              {mySub.file_id && <FileChip name={mySub.file_name || "Fayl"} href={`/api/files/${mySub.file_id}`} />}
            </div>
          )}
          {mySub?.status === "graded" ? <p className="text-sm text-ink-3">Qiymətləndirilmiş cavab dəyişdirilə bilməz.</p> : <SubmitForm hwId={hw.id} initialAnswer={mySub?.answer_text ?? ""} overdue={overdue} />}
        </Card>
      )}
      {data.canReview && <SubmissionsReview hwId={hw.id} canGrade={data.canManage} />}
    </div>
  );
}
