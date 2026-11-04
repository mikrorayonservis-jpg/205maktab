"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { api } from "@/lib/client/api";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

interface Student { id: number; student_code: string; first_name: string; last_name: string; class_id: number | null; class_name: string | null; has_account: number }
interface ClassOpt { id: number; name: string; is_active: number; student_count: number }
interface Preview { classId: number; className: string; moves: { id: number; name: string; from: string | null }[]; unchanged: number; missing: number[] }

const MAX_SELECTED = 2000;

export function PlacementClient() {
  const toast = useToast();
  const sp = useSearchParams();
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [filter, setFilter] = useState(sp.get("class") ?? "all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Student[]; total: number; pageSize: number } | null>(null);
  const [selected, setSelected] = useState<Map<number, string>>(new Map());
  const [target, setTarget] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<ClassOpt[]>("/api/admin/classes").then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setQuery(q.trim()); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    setData(null);
    const u = new URLSearchParams({ class: filter, page: String(page) });
    if (query) u.set("q", query);
    api<{ rows: Student[]; total: number; pageSize: number }>(`/api/admin/students/placement?${u}`).then(setData).catch(() => setData({ rows: [], total: 0, pageSize: 50 }));
  }, [filter, page, query]);
  useEffect(load, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const allOnPage = Boolean(data?.rows.length) && data!.rows.every((r) => selected.has(r.id));
  const activeClasses = useMemo(() => classes.filter((c) => c.is_active), [classes]);

  function toggle(s: Student, on: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (on) { if (next.size < MAX_SELECTED) next.set(s.id, `${s.last_name} ${s.first_name}`); } else next.delete(s.id);
      return next;
    });
  }
  function togglePage(on: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const s of data?.rows ?? []) {
        if (on && next.size < MAX_SELECTED) next.set(s.id, `${s.last_name} ${s.first_name}`);
        if (!on) next.delete(s.id);
      }
      return next;
    });
  }

  async function askPreview() {
    if (!target || !selected.size) return;
    setErr(null);
    setBusy(true);
    try {
      setPreview(await api<Preview>("/api/admin/students/placement", { body: { studentIds: [...selected.keys()], classId: Number(target), preview: true } }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xəta baş verdi.");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await api<Preview>("/api/admin/students/placement", { body: { studentIds: [...selected.keys()], classId: preview.classId, preview: false } });
      toast.success(`${r.moves.length} şagird ${r.className} sinfinə köçürüldü.`);
      setPreview(null);
      setSelected(new Map());
      load();
      api<ClassOpt[]>("/api/admin/classes").then(setClasses).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xəta baş verdi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <FormField id="pl-class" label="Sinif">
          <Select id="pl-class" value={filter} onChange={(e) => { setPage(1); setFilter(e.target.value); }}>
            <option value="all">Bütün şagirdlər</option>
            <option value="none">Sinfi olmayanlar</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.student_count})</option>)}
          </Select>
        </FormField>
        <FormField id="pl-q" label="Axtarış">
          <div className="relative">
            <Input id="pl-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, soyad və ya şagird kodu" className="pl-9" />
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          </div>
        </FormField>
      </div>

      <div className="sticky top-16 z-20 flex flex-col gap-3 rounded-lg border border-line bg-surface p-3 shadow-sm sm:flex-row sm:items-end">
        <p className="text-sm sm:mr-auto sm:self-center" aria-live="polite">
          <span className="font-semibold tabular-nums text-ink">{selected.size}</span> şagird seçilib
          {selected.size > 0 && <button type="button" className="ml-2 text-primary hover:underline" onClick={() => setSelected(new Map())}>Seçimi sıfırla</button>}
        </p>
        <FormField id="pl-target" label="Köçürüləcək sinif" className="w-full sm:w-56">
          <Select id="pl-target" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Sinif seçin…</option>
            {activeClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>
        <Button onClick={askPreview} disabled={!target || !selected.size} loading={busy && !preview}>Köçür <ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div>
      {err && <Alert tone="danger">{err}</Alert>}

      {!data ? <Skeleton className="h-72" /> : !data.rows.length ? (
        <EmptyState title={query ? "Axtarışa uyğun şagird yoxdur" : filter === "none" ? "Sinfi olmayan şagird yoxdur" : "Şagird tapılmadı"} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 text-sm text-ink-3">
            <label className="inline-flex min-h-10 items-center gap-2">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={allOnPage} onChange={(e) => togglePage(e.target.checked)} />
              Bu səhifədəkilərin hamısı
            </label>
            <span className="tabular-nums">Cəmi {data.total}</span>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {data.rows.map((s) => (
              <li key={s.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                  <input type="checkbox" className="size-4 shrink-0 accent-[var(--primary)]" checked={selected.has(s.id)} onChange={(e) => toggle(s, e.target.checked)} />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-medium text-ink">{s.last_name} {s.first_name}</span>
                    <span className="block break-all text-xs text-ink-3">{s.student_code}{s.has_account ? " · hesabı var" : ""}</span>
                  </span>
                  {s.class_name ? <Badge>{s.class_name}</Badge> : <Badge tone="warning">Sinifsiz</Badge>}
                </label>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Əvvəlki</Button>
              <span className="text-sm tabular-nums text-ink-3">{page} / {pages}</span>
              <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Növbəti</Button>
            </div>
          )}
        </>
      )}

      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview ? `${preview.className} sinfinə köçürmə` : ""}
        description={preview ? `${preview.moves.length} şagirdin sinfi dəyişəcək${preview.unchanged ? `, ${preview.unchanged} nəfər artıq bu sinifdədir` : ""}.` : undefined}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setPreview(null)}>Ləğv et</Button><Button onClick={apply} loading={busy} disabled={!preview?.moves.length}>Təsdiqlə və köçür</Button></>}
      >
        {preview && (preview.moves.length ? (
          <ul className="max-h-80 divide-y divide-line overflow-y-auto text-sm">
            {preview.moves.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2">
                <span className="min-w-0 flex-1 break-words font-medium text-ink">{m.name}</span>
                <span className="text-ink-3">{m.from ?? "sinifsiz"}</span>
                <ArrowRight className="size-3.5 text-ink-3" aria-hidden="true" />
                <span className="font-medium text-ink">{preview.className}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-3">Seçilmiş şagirdlərin hamısı artıq bu sinifdədir.</p>)}
        {preview && preview.missing.length > 0 && <Alert tone="warning" className="mt-3">{preview.missing.length} şagird tapılmadı (silinmiş ola bilər) və nəzərə alınmayacaq.</Alert>}
      </Dialog>
    </div>
  );
}
