"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";

interface Row { id: number; created_at: string; user_email: string | null; action: string; entity_type: string; entity_id: number | null; old_values: unknown; new_values: unknown; ip_address: string | null }

const PREFIXES = [["", "Bütün əməliyyatlar"], ["grade.", "Qiymətlər"], ["attendance.", "Davamiyyət"], ["user.", "İstifadəçilər"], ["news.", "Xəbərlər"], ["homework.", "Ev tapşırıqları"], ["lesson.", "Cədvəl"], ["invitation.", "Dəvətlər"], ["class.", "Siniflər və kodlar"]];

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
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(f); }} className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
        <Select aria-label="Əməliyyat növü" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} className="col-span-2 w-full sm:w-52">{PREFIXES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Input aria-label="İstifadəçinin e-poçtu" placeholder="İstifadəçinin e-poçtu" value={f.userEmail} onChange={(e) => setF({ ...f, userEmail: e.target.value })} className="col-span-2 w-full sm:w-60" />
        <Input aria-label="Başlanğıc tarix" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="w-full sm:w-40" />
        <Input aria-label="Son tarix" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="w-full sm:w-40" />
        <Button type="submit" variant="secondary">Filtrlə</Button>
        <a href={`/api/admin/audit?${qs({ format: "csv", page: "" })}`} className="inline-flex h-10 items-center justify-center gap-2 sm:ml-auto rounded-md border border-line-strong px-3 text-sm hover:bg-surface-2"><Download className="size-4" aria-hidden="true" /> CSV ixrac</a>
      </form>
      {!data ? <Skeleton className="h-80" /> : data.rows.length ? (
        <>
          {/* Telefon: kart görünüşü — cədvəl ekrandan kənara çıxmır */}
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface md:hidden">
            {data.rows.map((r) => (
              <li key={r.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-xs font-medium text-ink">{r.action}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-ink-3">{formatDateTime(r.created_at)}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>{open === r.id ? "Gizlət" : "Bax"}</Button>
                </div>
                <p className="mt-1.5 break-all text-sm text-ink-2">{r.user_email ?? "sistem"}</p>
                <p className="mt-0.5 break-all text-xs text-ink-3">{r.entity_type}{r.entity_id ? ` #${r.entity_id}` : ""}{r.ip_address ? ` · ${r.ip_address}` : ""}</p>
                {open === r.id && <Details r={r} />}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
            <table className="table-base">
              <thead><tr><th scope="col">Tarix</th><th scope="col">İstifadəçi</th><th scope="col">Əməliyyat</th><th scope="col">Obyekt</th><th scope="col">IP</th><th scope="col"><span className="sr-only">Təfərrüat</span></th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="whitespace-nowrap tabular-nums">{formatDateTime(r.created_at)}</td>
                      <td className="max-w-56 break-all">{r.user_email ?? "sistem"}</td>
                      <td className="break-all font-mono text-xs">{r.action}</td>
                      <td className="text-ink-2">{r.entity_type}{r.entity_id ? ` #${r.entity_id}` : ""}</td>
                      <td className="text-ink-3">{r.ip_address}</td>
                      <td className="text-right"><Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>{open === r.id ? "Gizlət" : "Bax"}</Button></td>
                    </tr>
                    {open === r.id && <tr><td colSpan={6} className="bg-surface-2"><Details r={r} /></td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : <EmptyState title="Qeyd tapılmadı" />}
      {pages > 1 && <div className="flex flex-wrap items-center justify-end gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Əvvəlki</Button><span className="text-sm tabular-nums text-ink-3">{page}/{pages}</span><Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Növbəti</Button></div>}
    </div>
  );
}

/** Köhnə/yeni dəyərlər: uzun URL, token və JSON sətirləri konteynerin enində qırılır */
function Details({ r }: { r: Row }) {
  const pre = "min-w-0 whitespace-pre-wrap rounded-md bg-surface p-2 text-xs [overflow-wrap:anywhere]";
  return (
    <div className="mt-2 grid min-w-0 gap-3 md:grid-cols-2">
      <pre className={pre}><strong>Əvvəl:</strong>{"\n"}{JSON.stringify(r.old_values, null, 2)}</pre>
      <pre className={pre}><strong>Sonra:</strong>{"\n"}{JSON.stringify(r.new_values, null, 2)}</pre>
    </div>
  );
}
