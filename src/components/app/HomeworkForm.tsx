"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { todayBaku } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { FileChip, FileUpload, type Uploaded } from "@/components/ui/FileUpload";

interface Initial { id: number; title: string; description: string | null; class_id: number; subject_id: number; due_date: string }

export function HomeworkForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pairs, setPairs] = useState<{ value: string; label: string }[]>([]);
  const [pair, setPair] = useState(initial ? `${initial.class_id}:${initial.subject_id}` : "");
  const [files, setFiles] = useState<Uploaded[]>([]);
  const { loading, error, fields, run } = useSubmit();
  useEffect(() => {
    api<{ assignments: { class_id: number; class_name: string; subject_id: number; subject_name: string }[] }>("/api/teacher/assignments").then((r) => {
      const opts = r.assignments.map((a) => ({ value: `${a.class_id}:${a.subject_id}`, label: `${a.class_name} · ${a.subject_name}` }));
      setPairs(opts);
      if (!pair && opts[0]) setPair(opts[0].value);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const [classId, subjectId] = pair.split(":").map(Number);
    const body = { classId, subjectId, title: fd.get("title"), description: fd.get("description"), dueDate: fd.get("dueDate"), fileIds: files.map((f) => f.id) };
    const r = await run(() => (initial ? api(`/api/homework/${initial.id}`, { method: "PATCH", body }) : api<{ id: number }>("/api/homework", { body })));
    if (r) router.push(initial ? `/homework/${initial.id}` : `/homework/${(r as { id: number }).id}`);
  }
  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4" noValidate>
      {error && <Alert tone="danger">{error}</Alert>}
      <FormField id="pair" label="Sinif və fənn" error={fields.classId || fields.subjectId} required>
        <Select id="pair" value={pair} onChange={(e) => setPair(e.target.value)} required>
          <option value="">Seçin…</option>
          {pairs.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </FormField>
      <FormField id="title" label="Başlıq" error={fields.title} required><Input id="title" name="title" defaultValue={initial?.title} maxLength={255} required /></FormField>
      <FormField id="description" label="Tapşırığın təsviri" error={fields.description}><Textarea id="description" name="description" rows={6} defaultValue={initial?.description ?? ""} maxLength={10000} /></FormField>
      <FormField id="dueDate" label="Son tarix" error={fields.dueDate} required><Input id="dueDate" name="dueDate" type="date" min={todayBaku()} defaultValue={initial?.due_date} required /></FormField>
      <div className="space-y-2">
        <p className="text-sm font-medium">Əlavə fayllar (PDF, şəkil, DOCX — maks. 5)</p>
        <div className="flex flex-wrap gap-2">{files.map((f) => <FileChip key={f.id} name={f.originalName} onRemove={() => setFiles((x) => x.filter((y) => y.id !== f.id))} />)}</div>
        {files.length < 5 && <FileUpload purpose="homework" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx" onUploaded={(f) => setFiles((x) => [...x, f])} />}
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={loading}>{initial ? "Yadda saxla" : "Tapşırığı ver"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Ləğv et</Button>
      </div>
    </form>
  );
}
