"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";
import { Input, Select } from "@/components/ui/Field";
import { Badge, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";

interface U { id: number; email: string; first_name: string | null; last_name: string | null; is_active: number; email_verified: number; last_login_at: string | null; roles: string[] }

export function UsersClient({ roles }: { roles: { code: string; name: string }[] }) {
  const [rows, setRows] = useState<U[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const names = Object.fromEntries(roles.map((r) => [r.code, r.name]));
  const load = useCallback(() => {
    setRows(null);
    const u = new URLSearchParams({ page: String(page) });
    if (query) u.set("q", query);
    if (role) u.set("role", role);
    api<{ rows: U[]; total: number }>(`/api/admin/users?${u}`).then((r) => { setRows(r.rows); setTotal(r.total); }).catch(() => setRows([]));
  }, [page, query, role]);
  useEffect(load, [load]);
  const pages = Math.max(1, Math.ceil(total / 25));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q); }}><label className="sr-only" htmlFor="uq">Axtar</label><Input id="uq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, soyad və ya e-poçt…" className="w-72" /></form>
        <Select aria-label="Rol" value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }} className="w-56"><option value="">Bütün rollar</option>{roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}</Select>
      </div>
      {!rows ? <Skeleton className="h-72" /> : rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="table-base">
            <thead><tr><th scope="col">İstifadəçi</th><th scope="col">Rollar</th><th scope="col">Status</th><th scope="col">Son giriş</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><Link href={`/admin/users/${u.id}`} className="font-medium hover:text-primary">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</Link><span className="block text-xs text-ink-3">{u.email}</span></td>
                  <td><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone="primary">{names[r] ?? r}</Badge>)}</div></td>
                  <td>{u.is_active ? (u.email_verified ? <Badge tone="success">Aktiv</Badge> : <Badge tone="warning">Təsdiqlənməyib</Badge>) : <Badge tone="danger">Deaktiv</Badge>}</td>
                  <td className="whitespace-nowrap text-ink-3">{u.last_login_at ? formatDateTime(u.last_login_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="İstifadəçi tapılmadı" />}
      {pages > 1 && <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Əvvəlki</Button><span className="text-sm tabular-nums text-ink-3">{page}/{pages}</span><Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Növbəti</Button></div>}
    </div>
  );
}
