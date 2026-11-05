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
  const navCls = (on: boolean) =>
    cn(
      "chip lg:min-h-11 lg:w-full lg:justify-start lg:whitespace-normal lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:text-left lg:text-sm",
      !on && "lg:bg-transparent lg:hover:bg-surface"
    );
  return (
    <>
      <PageIntro eyebrow="Məktəb" title="Rəsmi sənədlər" crumbs={[{ href: "/about", label: "Haqqımızda" }, { label: "Sənədlər" }]}>
        Nizamnamə, tədris planları, daxili qaydalar, hesabatlar və rəsmi sərəncamlar — PDF formatında baxmaq və yükləmək üçün.
      </PageIntro>
      <div className="container-page grid gap-8 py-10 md:py-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Sənəd kateqoriyaları">
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
            <li className="shrink-0"><Link href="/documents" aria-current={!cat ? "page" : undefined} className={navCls(!cat)}>Bütün sənədlər</Link></li>
            {Object.entries(DOCUMENT_CATEGORIES).map(([k, label]) => (
              <li key={k} className="shrink-0"><Link href={`/documents?kateqoriya=${k}`} aria-current={cat === k ? "page" : undefined} className={navCls(cat === k)}>{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-10">
          {!groups.length && <EmptyState title="Bu bölmədə sənəd yoxdur" icon={<FileText />}>Sənədlər dərc edildikdən sonra burada görünəcək.</EmptyState>}
          {groups.map((g) => (
            <section key={g.k} aria-labelledby={`dc-${g.k}`}>
              <h2 id={`dc-${g.k}`} className="mb-4 flex items-baseline gap-3 font-display text-xl font-bold">
                {g.label} <span className="text-sm font-medium text-ink-3">{g.items.length}</span>
              </h2>
              <ul className="card divide-y divide-line">
                {g.items.map((d) => (
                  <li key={d.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <span className="flex h-14 w-11 shrink-0 flex-col items-center justify-end rounded-md border border-line bg-danger-soft pb-1.5 text-[10px] font-extrabold tracking-wide text-danger" aria-hidden="true">PDF</span>
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{d.title_az}</p>
                        {d.description_az && <p className="mt-0.5 text-sm text-ink-2">{d.description_az}</p>}
                        <p className="mt-1 text-xs text-ink-3">PDF{d.file_size ? ` · ${formatFileSize(d.file_size)}` : ""} · {formatDate(d.published_on || d.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 sm:ml-4">
                      <a href={d.file_url} target="_blank" rel="noopener" className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line-strong px-4 text-sm font-semibold hover:border-primary hover:text-primary sm:flex-none">
                        <Eye className="size-4" aria-hidden="true" /> Bax<span className="sr-only">: {d.title_az}</span>
                      </a>
                      <a href={d.file_url} download className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-navy px-4 text-sm font-semibold text-navy-ink hover:bg-navy-hover sm:flex-none">
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
