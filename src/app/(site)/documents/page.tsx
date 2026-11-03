import type { Metadata } from "next";
import Link from "next/link";
import { Download, Eye, FileText } from "lucide-react";
import { DOCUMENT_CATEGORIES, publicDocuments } from "@/server/content";
import { PageIntro } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { formatDate, formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rəsmi sənədlər", description: "Nizamnamə, tədris planları, daxili qaydalar, hesabatlar və rəsmi sərəncamlar.", alternates: { canonical: "/documents" } };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ kateqoriya?: string }> }) {
  const { kateqoriya } = await searchParams;
  const cat = kateqoriya && kateqoriya in DOCUMENT_CATEGORIES ? kateqoriya : undefined;
  const docs = await publicDocuments(cat);
  const groups = Object.entries(DOCUMENT_CATEGORIES)
    .filter(([k]) => !cat || k === cat)
    .map(([k, label]) => ({ k, label, items: docs.filter((d) => d.category_az === k) }))
    .filter((g) => g.items.length);
  return (
    <>
      <PageIntro eyebrow="Məktəb" title="Rəsmi sənədlər" crumbs={[{ label: "Sənədlər" }]} />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Sənəd kateqoriyaları">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            <li><Link href="/documents" className={cn("block shrink-0 rounded-md px-3 py-2 text-sm", !cat ? "bg-primary-soft font-medium text-primary" : "hover:bg-surface-2")}>Bütün sənədlər</Link></li>
            {Object.entries(DOCUMENT_CATEGORIES).map(([k, label]) => (
              <li key={k}><Link href={`/documents?kateqoriya=${k}`} className={cn("block shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm lg:whitespace-normal", cat === k ? "bg-primary-soft font-medium text-primary" : "hover:bg-surface-2")}>{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-10">
          {!groups.length && <EmptyState title="Bu bölmədə sənəd yoxdur" icon={<FileText className="size-8" />} />}
          {groups.map((g) => (
            <section key={g.k} aria-labelledby={`dc-${g.k}`}>
              <h2 id={`dc-${g.k}`} className="mb-3 text-xl font-semibold">{g.label}</h2>
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {g.items.map((d) => (
                  <li key={d.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <FileText className="hidden size-8 shrink-0 text-danger sm:block" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{d.title_az}</p>
                      {d.description_az && <p className="text-sm text-ink-3">{d.description_az}</p>}
                      <p className="mt-0.5 text-xs text-ink-3">PDF{d.file_size ? ` · ${formatFileSize(d.file_size)}` : ""} · {formatDate(d.published_on || d.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={d.file_url} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm hover:bg-surface-2">
                        <Eye className="size-4" aria-hidden="true" /> Bax<span className="sr-only">: {d.title_az}</span>
                      </a>
                      <a href={d.file_url} download className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-ink hover:bg-primary-hover">
                        <Download className="size-4" aria-hidden="true" /> Yüklə<span className="sr-only">: {d.title_az}</span>
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
