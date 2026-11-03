"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { Alert, Card, Skeleton } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

export function PagesEditor({ slugs }: { slugs: { slug: string; label: string }[] }) {
  const toast = useToast();
  const [slug, setSlug] = useState(slugs[0].slug);
  const [data, setData] = useState<{ title: string; content: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const { loading, error, fields, run } = useSubmit();
  useEffect(() => {
    setData(null);
    api<{ title_az: string; content_md: string }>(`/api/admin/pages/${slug}`).then((p) => setData({ title: p.title_az, content: p.content_md })).catch(() => setData({ title: "", content: "" }));
  }, [slug]);
  async function save() {
    if (!data) return;
    const r = await run(() => api(`/api/admin/pages/${slug}`, { method: "PUT", body: data }));
    if (r) toast.success("Səhifə yadda saxlanıldı.");
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Səhifələr"><ul className="space-y-1">{slugs.map((s) => <li key={s.slug}><button type="button" onClick={() => setSlug(s.slug)} aria-current={slug === s.slug ? "page" : undefined} className={cn("w-full rounded-md px-3 py-2 text-left text-sm", slug === s.slug ? "bg-primary-soft font-medium text-primary" : "hover:bg-surface-2")}>{s.label}</button></li>)}</ul></nav>
      <Card className="space-y-4 p-6">
        {!data ? <Skeleton className="h-80" /> : (
          <>
            {error && <Alert tone="danger">{error}</Alert>}
            <FormField id="p-title" label="Başlıq" error={fields.title} required><Input id="p-title" value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} /></FormField>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Məzmun</span><Button size="sm" variant="ghost" onClick={() => setPreview((p) => !p)}>{preview ? "Redaktə" : "Önizləmə"}</Button></div>
            {preview ? <div className="prose-az min-h-64 rounded-md border border-line p-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.content) }} /> : <Textarea aria-label="Məzmun" value={data.content} onChange={(e) => setData({ ...data, content: e.target.value })} rows={18} className="font-mono" />}
            <p className="text-xs text-ink-3">Format: ## başlıq, **qalın**, *kursiv*, - siyahı, &gt; sitat, [mətn](https://...)</p>
            <Button onClick={save} loading={loading}>Yadda saxla</Button>
          </>
        )}
      </Card>
    </div>
  );
}
