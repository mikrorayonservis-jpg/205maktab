"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";

interface Row { id: number; created_at: string; user_email: string | null; action: string; entity_type: string; entity_id: number | null; old_values: unknown; new_values: unknown; ip_address: string | null }

const PREFIXES = [["", "Bütün əməliyyatlar"], ["grade.", "Qiymətlər"], ["attendance.", "Davamiyyət"], ["user.", "İstifadəçilər"], ["news.", "Xəbərlər"], ["homework.", "Ev tapşırıqları"], ["lesson.", "Cədvəl"], ["invitation.", "Dəvətlər"]];

export function AuditClient() {
  const [f, setF] = useState({ action: "", userEmail: "", from: "", to: "" });
  const [applied, setApplied] = useState(f);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Row[]; total: number } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const qs = useCallback((extra: Record<string, string> = {}) => {
    const u = new URLSearchParams(Object.entries({ ...applied, page: String(page), ...extra }).filter(([, v]) => v) as [string, string][]);
    return u.toString();
  }, [applied, page]);
  useEffect(() => { setData(null); api<{ rows: Row[]; total: number }>(`/api/admin/audit?${qs()}`).then(setData).catch(() => setData({ rows: [], total: 0 })); }, [qs]);
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 50));
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(f); }} className="flex flex-wrap items-end gap-3">
        <Select aria-label="Əməliyyat növü" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} className="w-full sm:w-52">{PREFIXES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Input aria-label="İstifadəçinin e-poçtu" placeholder="İstifadəçinin e-poçtu" value={f.userEmail} onChange={(e) => setF({ ...f, userEmail: e.target.value })} className="w-full sm:w-60" />
        <Input aria-label="Başlanğıc tarix" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="min-w-0 flex-1 sm:w-40 sm:flex-none" />
        <Input aria-label="Son tarix" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="min-w-0 flex-1 sm:w-40 sm:flex-none" />
        <Button type="submit" variant="secondary">Filtrlə</Button>
        <a href={`/api/admin/audit?${qs({ format: "csv", page: "" })}`} className="ml-auto inline-flex h-10 items-center gap-2 rounded-md border border-line-strong px-3 text-sm hover:bg-surface-2"><Download className="size-4" aria-hidden="true" /> CSV ixrac</a>
      </form>
      {!data ? <Skeleton className="h-80" /> : data.rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="table-base">
            <thead><tr><th scope="col">Tarix</th><th scope="col">İstifadəçi</th><th scope="col">Əməliyyat</th><th scope="col">Obyekt</th><th scope="col">IP</th><th scope="col"><span className="sr-only">Təfərrüat</span></th></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td className="whitespace-nowrap tabular-nums">{formatDateTime(r.created_at)}</td>
                    <td>{r.user_email ?? "sistem"}</td>
                    <td className="font-mono text-xs">{r.action}</td>
                    <td className="text-ink-2">{r.entity_type}{r.entity_id ? ` #${r.entity_id}` : ""}</td>
                    <td className="text-ink-3">{r.ip_address}</td>
                    <td className="text-right"><Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>{open === r.id ? "Gizlət" : "Bax"}</Button></td>
                  </tr>
                  {open === r.id && (
                    <tr><td colSpan={6} className="bg-surface-2"><div className="grid gap-3 md:grid-cols-2"><pre className="overflow-x-auto whitespace-pre-wrap text-xs"><strong>Əvvəl:</strong>{"\n"}{JSON.stringify(r.old_values, null, 2)}</pre><pre className="overflow-x-auto whitespace-pre-wrap text-xs"><strong>Sonra:</strong>{"\n"}{JSON.stringify(r.new_values, null, 2)}</pre></div></td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Qeyd tapılmadı" />}
      {pages > 1 && <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Əvvəlki</Button><span className="text-sm tabular-nums text-ink-3">{page}/{pages}</span><Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Növbəti</Button></div>}
    </div>
  );
}
