import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePagePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { editorialList, NEWS_STATUS, type NewsStatus } from "@/server/news";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Feedback";
import { LinkButton } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { STATUS_TONE } from "@/components/app/news-status";

export const metadata: Metadata = { title: "Redaksiya" };


export default async function EditorialPage({ searchParams }: { searchParams: Promise<{ scope?: string; status?: string; page?: string; q?: string }> }) {
  const u = await requirePagePermission(["news.submit", "news.review", "news.publish", "news.edit_any"], "/editorial");
  const sp = await searchParams;
  const staff = can(u, "news.review") || can(u, "news.publish") || can(u, "news.edit_any");
  const scope = (staff && (sp.scope === "queue" || sp.scope === "all") ? sp.scope : staff && !sp.scope ? "queue" : "mine") as "mine" | "queue" | "all";
  const status = sp.status && sp.status in NEWS_STATUS ? (sp.status as NewsStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await editorialList(u, { scope, status, search: sp.q?.slice(0, 100), page });
  const tabs = staff ? [["queue", "Yoxlama növbəsi"], ["all", "Bütün məqalələr"], ["mine", "Mənim məqalələrim"]] : [["mine", "Mənim məqalələrim"]];
  const qs = (p: Record<string, string | undefined>) => {
    const m = { scope, status, q: sp.q, ...p };
    const u2 = new URLSearchParams(Object.entries(m).filter(([, v]) => v) as [string, string][]);
    return `/editorial?${u2.toString()}`;
  };
  return (
    <div>
      <PageHeader title="Redaksiya" description="Məqalələr avtomatik dərc edilmir: müəllif → redaktor təsdiqi → baş redaktor dərci." actions={can(u, "news.submit") && <LinkButton href="/editorial/new"><Plus className="size-4" aria-hidden="true" /> Yeni məqalə</LinkButton>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map(([k, l]) => <Link key={k} href={qs({ scope: k, page: undefined, status: undefined })} className={cn("rounded-full border px-3 py-1.5 text-sm", scope === k ? "border-primary bg-primary text-primary-ink" : "border-line hover:bg-surface-2")}>{l}</Link>)}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        {(Object.keys(NEWS_STATUS) as NewsStatus[]).map((s) => <Link key={s} href={qs({ status: status === s ? undefined : s, page: undefined })} className={cn("rounded-full border px-2.5 py-1 text-xs", status === s ? "border-primary bg-primary-soft text-primary" : "border-line")}>{NEWS_STATUS[s]}</Link>)}
        <form className="ml-auto" action="/editorial"><input type="hidden" name="scope" value={scope} /><label className="sr-only" htmlFor="eq">Axtarış</label><input id="eq" name="q" defaultValue={sp.q} placeholder="Başlıqda axtar…" className="h-9 rounded-md border border-line-strong bg-surface px-3 text-sm" /></form>
      </div>
      {data.rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="table-base">
            <thead><tr><th scope="col">Başlıq</th><th scope="col">Status</th><th scope="col">Müəllif</th><th scope="col">Kateqoriya</th><th scope="col">Yenilənib</th></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-md"><Link href={`/editorial/${r.id}`} className="font-medium hover:text-primary">{r.title_az}</Link>{r.contains_minors && !r.consent_confirmed ? <Badge tone="warning" className="ml-2">Razılıq gözlənilir</Badge> : null}</td>
                  <td><Badge tone={STATUS_TONE[r.status as NewsStatus]}>{NEWS_STATUS[r.status as NewsStatus]}</Badge></td>
                  <td className="text-ink-2">{r.author_name || r.author_email}</td>
                  <td className="text-ink-2">{r.category_name ?? "—"}</td>
                  <td className="whitespace-nowrap tabular-nums text-ink-3">{formatDateTime(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Məqalə yoxdur" />}
      <Pagination page={page} total={data.total} pageSize={data.pageSize} href={(p) => qs({ page: String(p) })} />
    </div>
  );
}
