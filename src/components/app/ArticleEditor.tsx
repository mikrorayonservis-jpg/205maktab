"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bold, Heading2, Image as ImageIcon, Italic, Link2, List, Quote } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { FileUpload } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";

export interface ArticleData {
  id?: number;
  title: string;
  summary: string;
  content: string;
  categoryId: string;
  coverImage: string;
  coverAlt: string;
  byline: string;
  seoTitle: string;
  seoDescription: string;
  containsMinors: boolean;
  consentConfirmed: boolean;
  isFeatured: boolean;
  galleryId: string;
}

const EMPTY: ArticleData = { title: "", summary: "", content: "", categoryId: "", coverImage: "", coverAlt: "", byline: "", seoTitle: "", seoDescription: "", containsMinors: false, consentConfirmed: false, isFeatured: false, galleryId: "" };

export function ArticleEditor({ initial, perms, readOnly }: { initial?: ArticleData; perms: { canUpload: boolean; canConsent: boolean; canFeature: boolean }; readOnly?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState<ArticleData>(initial ?? EMPTY);
  const [cats, setCats] = useState<{ value: string; label: string }[]>([]);
  const [galleries, setGalleries] = useState<{ value: string; label: string }[]>([]);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const area = useRef<HTMLTextAreaElement>(null);
  const { loading, error, fields, run } = useSubmit();

  useEffect(() => {
    api<{ value: string; label: string }[]>("/api/admin/options?source=news_categories").then(setCats).catch(() => undefined);
    api<{ value: string; label: string }[]>("/api/admin/options?source=galleries").then(setGalleries).catch(() => undefined);
  }, []);

  const set = <K extends keyof ArticleData>(k: K, v: ArticleData[K]) => setD((x) => ({ ...x, [k]: v }));

  function wrap(before: string, after = before, placeholder = "mətn") {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    set("content", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  }
  function linePrefix(prefix: string) {
    const el = area.current;
    if (!el) return;
    const s = el.selectionStart;
    const start = d.content.lastIndexOf("\n", s - 1) + 1;
    set("content", d.content.slice(0, start) + prefix + d.content.slice(start));
    requestAnimationFrame(() => el.focus());
  }

  async function save() {
    const body = { ...d, categoryId: d.categoryId || null, galleryId: d.galleryId || null };
    delete (body as { id?: number }).id;
    const r = await run(() => (d.id ? api<{ id: number }>(`/api/editorial/${d.id}`, { method: "PUT", body }) : api<{ id: number }>("/api/editorial", { body })));
    if (r) {
      toast.success("Məqalə yadda saxlanıldı.");
      if (!d.id) router.push(`/editorial/${r.id}`);
      else router.refresh();
    }
  }

  const tool = "inline-flex size-8 items-center justify-center rounded text-ink-2 hover:bg-surface-2 hover:text-ink";

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <FormField id="title" label="Başlıq" error={fields.title} required>
          <Input id="title" value={d.title} onChange={(e) => set("title", e.target.value)} maxLength={300} disabled={readOnly} className="h-12 font-display text-lg" />
        </FormField>
        <FormField id="summary" label="Qısa təsvir (lead)" error={fields.summary} hint="Xəbər siyahısında və axtarış nəticələrində göstərilir.">
          <Textarea id="summary" value={d.summary} onChange={(e) => set("summary", e.target.value)} rows={2} maxLength={600} disabled={readOnly} />
        </FormField>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium" id="content-label">Əsas mətn <span className="text-danger" aria-hidden="true">*</span></span>
            <div role="tablist" className="flex rounded-md border border-line p-0.5 text-xs">
              {(["write", "preview"] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={cn("rounded px-2.5 py-1", tab === t ? "bg-primary text-primary-ink" : "text-ink-2")}>{t === "write" ? "Yaz" : "Önizləmə"}</button>
              ))}
            </div>
          </div>
          {tab === "write" ? (
            <div className="rounded-md border border-line-strong focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
              {!readOnly && (
                <div className="flex flex-wrap gap-0.5 border-b border-line p-1" role="toolbar" aria-label="Formatlama">
                  <button type="button" className={tool} onClick={() => linePrefix("## ")} aria-label="Başlıq"><Heading2 className="size-4" /></button>
                  <button type="button" className={tool} onClick={() => wrap("**")} aria-label="Qalın"><Bold className="size-4" /></button>
                  <button type="button" className={tool} onClick={() => wrap("*")} aria-label="Kursiv"><Italic className="size-4" /></button>
                  <button type="button" className={tool} onClick={() => linePrefix("- ")} aria-label="Siyahı"><List className="size-4" /></button>
                  <button type="button" className={tool} onClick={() => linePrefix("> ")} aria-label="Sitat"><Quote className="size-4" /></button>
                  <button type="button" className={tool} onClick={() => wrap("[", "](https://)", "keçid mətni")} aria-label="Keçid"><Link2 className="size-4" /></button>
                  {perms.canUpload && (
                    <FileUpload purpose="news" accept="image/jpeg,image/png,image/webp" label="Şəkil" onUploaded={(f) => set("content", `${d.content}\n\n![Şəklin təsviri](${f.url})\n`)} className="ml-auto" />
                  )}
                </div>
              )}
              <textarea ref={area} id="content" aria-labelledby="content-label" value={d.content} onChange={(e) => set("content", e.target.value)} rows={20} disabled={readOnly} className="block w-full resize-y border-0 bg-transparent p-3 font-mono text-sm leading-relaxed focus:outline-none" aria-invalid={Boolean(fields.content)} />
            </div>
          ) : (
            <div className="prose-az min-h-64 rounded-md border border-line bg-surface p-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(d.content) || "<p>Mətn boşdur.</p>" }} />
          )}
          {fields.content && <p role="alert" className="mt-1 text-xs text-danger">{fields.content}</p>}
          <p className="mt-1 text-xs text-ink-3">Format: ## başlıq, **qalın**, *kursiv*, - siyahı, &gt; sitat, [mətn](https://keçid).</p>
        </div>
      </div>
      <aside className="space-y-4">
        {!readOnly && <Button onClick={save} loading={loading} className="w-full">Yadda saxla</Button>}
        <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
          <FormField id="cat" label="Kateqoriya" error={fields.categoryId}>
            <Select id="cat" value={d.categoryId} onChange={(e) => set("categoryId", e.target.value)} disabled={readOnly}>
              <option value="">—</option>{cats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </FormField>
          <div className="space-y-2">
            <p className="text-sm font-medium">Örtük şəkli</p>
            {d.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.coverImage} alt="" className="aspect-[3/2] w-full rounded-md object-cover" />
            )}
            {!readOnly && perms.canUpload && <FileUpload purpose="news" accept="image/jpeg,image/png,image/webp" label={d.coverImage ? "Dəyiş" : "Şəkil yüklə"} onUploaded={(f) => set("coverImage", f.url)} />}
            {d.coverImage && !readOnly && <button type="button" onClick={() => set("coverImage", "")} className="text-xs text-danger hover:underline">Şəkli çıxar</button>}
            {fields.coverImage && <p className="text-xs text-danger">{fields.coverImage}</p>}
          </div>
          <FormField id="alt" label="Şəklin təsviri (alt mətn)" error={fields.coverAlt}><Input id="alt" value={d.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} maxLength={255} disabled={readOnly} /></FormField>
          <FormField id="byline" label="Müəllif adı (imza)" hint="Boş qalsa hesab adınız göstərilir." error={fields.byline}><Input id="byline" value={d.byline} onChange={(e) => set("byline", e.target.value)} maxLength={200} disabled={readOnly} /></FormField>
          {galleries.length > 0 && (
            <FormField id="gal" label="Bağlı foto albom"><Select id="gal" value={d.galleryId} onChange={(e) => set("galleryId", e.target.value)} disabled={readOnly}><option value="">—</option>{galleries.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</Select></FormField>
          )}
        </div>
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <p className="text-sm font-medium">Uşaqların məxfiliyi</p>
          <Checkbox label="Məqalədə şagirdlərin foto və ya tam adları var" checked={d.containsMinors} onChange={(e) => set("containsMinors", e.target.checked)} disabled={readOnly} />
          {perms.canConsent ? (
            <Checkbox label="Valideyn razılığı alınıb (təsdiqləyirəm)" checked={d.consentConfirmed} onChange={(e) => set("consentConfirmed", e.target.checked)} disabled={readOnly} />
          ) : d.containsMinors ? (
            <p className="text-xs text-ink-3">Razılığı redaktor təsdiqləyəcək. Razılıq olmadan məqalə dərc edilmir.</p>
          ) : null}
          {perms.canFeature && <Checkbox label="Ana səhifədə önə çıxar" checked={d.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} disabled={readOnly} />}
        </div>
        <details className="rounded-lg border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium">SEO parametrləri</summary>
          <div className="mt-3 space-y-3">
            <FormField id="seot" label="SEO başlıq" error={fields.seoTitle}><Input id="seot" value={d.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={300} disabled={readOnly} /></FormField>
            <FormField id="seod" label="SEO təsvir" hint={`${d.seoDescription.length}/160 tövsiyə`} error={fields.seoDescription}><Textarea id="seod" value={d.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={3} maxLength={320} disabled={readOnly} /></FormField>
          </div>
        </details>
      </aside>
    </div>
  );
}
