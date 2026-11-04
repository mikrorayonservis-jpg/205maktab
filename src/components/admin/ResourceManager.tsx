"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Images, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { formatDate, formatDateTime } from "@/lib/format";
import { getResource, type FieldDef, type OptionSource } from "@/config/admin-resources";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { FileChip, FileUpload } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";

type Row = Record<string, unknown> & { id: number };
type Opts = Record<string, { value: string; label: string }[]>;

const PURPOSE_ACCEPT: Record<string, string> = { document: "application/pdf,.pdf" };

function display(f: FieldDef, v: unknown, opts: Opts): React.ReactNode {
  if (v === null || v === undefined || v === "") return <span className="text-ink-3">—</span>;
  if (f.type === "boolean") return Number(v) ? <Badge tone="success">Bəli</Badge> : <Badge>Xeyr</Badge>;
  if (f.type === "date") return formatDate(String(v));
  if (f.type === "datetime") return formatDateTime(String(v));
  if (f.type === "time") return String(v).slice(0, 5);
  if (f.type === "select") {
    const list = f.options ?? opts[f.source ?? ""] ?? [];
    return list.find((o) => o.value === String(v))?.label ?? String(v);
  }
  if (f.type === "image") return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={String(v)} alt="" className="size-10 rounded object-cover" />
  );
  if (f.name === "user_id") return <Badge tone="success">Bağlıdır</Badge>;
  const s = String(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

function toInput(f: FieldDef, v: unknown): string | boolean {
  if (f.type === "boolean") return v === undefined || v === null ? Boolean(f.default) : Boolean(Number(v));
  if (v === null || v === undefined) return f.default !== undefined ? String(f.default) : "";
  if (f.type === "datetime") return String(v).replace(" ", "T").slice(0, 16);
  if (f.type === "time") return String(v).slice(0, 5);
  return String(v);
}

export function ResourceManager({ resourceKey }: { resourceKey: string }) {
  const def = getResource(resourceKey)!;
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [opts, setOpts] = useState<Opts>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<number[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const pageSize = 20;

  const listFields = def.fields.filter((f) => f.list);
  const sources = useMemo(() => [...new Set(def.fields.map((f) => f.source).filter(Boolean))] as OptionSource[], [def]);

  useEffect(() => {
    for (const s of sources) api<{ value: string; label: string }[]>(`/api/admin/options?source=${s}`).then((o) => setOpts((x) => ({ ...x, [s]: o }))).catch(() => undefined);
  }, [sources]);

  const qs = useCallback(() => {
    const u = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query) u.set("q", query);
    for (const [k, v] of Object.entries(filters)) if (v) u.set(`f_${k}`, v);
    return u.toString();
  }, [page, query, filters]);

  const load = useCallback(() => {
    setRows(null);
    setLoadErr(null);
    api<{ rows: Row[]; total: number }>(`/api/admin/r/${def.key}?${qs()}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); setSelected([]); })
      .catch((e) => setLoadErr(e.message));
  }, [def.key, qs]);
  useEffect(load, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      if (deleting.length === 1) await api(`/api/admin/r/${def.key}/${deleting[0]}`, { method: "DELETE" });
      else await api(`/api/admin/r/${def.key}/bulk`, { body: { action: "delete", ids: deleting } });
      toast.success(`${deleting.length} qeyd silindi.`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const exportHref = `/api/admin/r/${def.key}/export?${qs()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {def.search.length > 0 && (
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q); }} className="relative w-full sm:w-auto" role="search">
            <label htmlFor="rm-q" className="sr-only">Axtar</label>
            <Input id="rm-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Axtar…" className="w-full pl-9 sm:w-64" />
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          </form>
        )}
        {(def.filters || []).map((fname) => {
          const f = def.fields.find((x) => x.name === fname);
          if (!f) return null;
          const list = f.options ?? opts[f.source ?? ""] ?? [];
          return (
            <Select key={fname} aria-label={f.label} value={filters[fname] || ""} onChange={(e) => { setPage(1); setFilters((x) => ({ ...x, [fname]: e.target.value })); }} className="w-full sm:w-52">
              <option value="">{f.label}: hamısı</option>
              {list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          );
        })}
        <div className="ml-auto flex flex-wrap gap-2">
          {selected.length > 0 && <Button variant="danger" size="sm" onClick={() => setDeleting(selected)}><Trash2 className="size-4" aria-hidden="true" /> Seçilənləri sil ({selected.length})</Button>}
          <a href={exportHref} className="inline-flex h-8 items-center gap-2 rounded-md border border-line-strong px-3 text-sm hover:bg-surface-2"><Download className="size-4" aria-hidden="true" /> CSV</a>
          <Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden="true" /> Əlavə et</Button>
        </div>
      </div>

      {loadErr && <Alert tone="danger">{loadErr}</Alert>}
      {!rows && !loadErr && <Skeleton className="h-72 w-full" />}
      {rows && (rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="table-base">
            <thead>
              <tr>
                <th scope="col" className="w-10"><input type="checkbox" aria-label="Hamısını seç" checked={selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
                {listFields.map((f) => <th key={f.name} scope="col">{f.label}</th>)}
                <th scope="col" className="text-right">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" aria-label={`Seç: ${String(r[listFields[0]?.name] ?? r.id)}`} checked={selected.includes(r.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} /></td>
                  {listFields.map((f) => <td key={f.name}>{display(f, r[f.name], opts)}</td>)}
                  <td className="whitespace-nowrap text-right">
                    {def.key === "galleries" && <Link href={`/admin/galleries/${r.id}`} className="mr-1 inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-primary hover:bg-surface-2"><Images className="size-4" aria-hidden="true" /> Media</Link>}
                    <Button variant="ghost" size="sm" onClick={() => setEditing(r)} aria-label="Redaktə et"><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting([r.id])} aria-label="Sil" className="text-danger"><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Qeyd tapılmadı" action={<Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden="true" /> Əlavə et</Button>} />
      ))}
      {pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-3">
          <span>Cəmi {total} qeyd</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Əvvəlki</Button>
            <span className="tabular-nums">{page} / {pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Növbəti</Button>
          </div>
        </div>
      )}
      {editing && <EditDialog resourceKey={def.key} row={editing === "new" ? null : editing} opts={opts} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); toast.success("Yadda saxlanıldı."); load(); }} />}
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete} title="Silməni təsdiqləyin" message={`${deleting?.length ?? 0} qeyd silinəcək. Əməliyyat audit jurnalında qeyd olunur.`} confirmLabel="Sil" danger />
    </div>
  );
}

function EditDialog({ resourceKey, row, opts, onClose, onSaved }: { resourceKey: string; row: Row | null; opts: Opts; onClose: () => void; onSaved: () => void }) {
  const def = getResource(resourceKey)!;
  const fields = def.fields.filter((f) => !f.readOnly);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => Object.fromEntries(fields.map((f) => [f.name, toInput(f, row?.[f.name])])));
  const { loading, error, fields: errs, run } = useSubmit();
  const set = (k: string, v: string | boolean) => setValues((x) => ({ ...x, [k]: v }));

  async function save() {
    const body: Record<string, unknown> = {};
    for (const f of fields) body[f.name] = values[f.name];
    const r = await run(() => (row ? api(`/api/admin/r/${def.key}/${row.id}`, { method: "PATCH", body }) : api(`/api/admin/r/${def.key}`, { body })));
    if (r) onSaved();
  }

  return (
    <Dialog open onClose={onClose} title={row ? `${def.singular}: redaktə` : `Yeni ${def.singular.toLocaleLowerCase("az")}`} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Ləğv et</Button><Button onClick={save} loading={loading}>Yadda saxla</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-4 sm:grid-cols-2" noValidate>
        {error && <Alert tone="danger" className="sm:col-span-2">{error}</Alert>}
        {fields.map((f) => {
          const id = `f-${f.name}`;
          const v = values[f.name];
          const wide = ["textarea", "markdown", "image", "file"].includes(f.type);
          if (f.type === "boolean") {
            return <div key={f.name} className="flex items-end pb-2"><Checkbox id={id} label={f.label} checked={Boolean(v)} onChange={(e) => set(f.name, e.target.checked)} />{errs[f.name] && <p className="ml-2 text-xs text-danger">{errs[f.name]}</p>}</div>;
          }
          return (
            <FormField key={f.name} id={id} label={f.label} required={f.required} error={errs[f.name]} hint={f.type === "markdown" ? "Format: ## başlıq, **qalın**, - siyahı, [mətn](https://...)" : f.help} className={wide ? "sm:col-span-2" : undefined}>
              {f.type === "textarea" || f.type === "markdown" ? (
                <Textarea id={id} value={String(v)} onChange={(e) => set(f.name, e.target.value)} rows={f.type === "markdown" ? 8 : 4} maxLength={f.max} />
              ) : f.type === "select" ? (
                <Select id={id} value={String(v)} onChange={(e) => set(f.name, e.target.value)}>
                  <option value="">—</option>
                  {(f.options ?? opts[f.source ?? ""] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : f.type === "image" || f.type === "file" ? (
                <div className="space-y-2">
                  {v && f.type === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(v)} alt="" className="h-28 rounded-md border border-line object-cover" />
                  )}
                  {v && f.type === "file" && <FileChip name={String(v).split("/").pop() || "fayl"} href={String(v)} onRemove={() => set(f.name, "")} />}
                  <div className="flex items-center gap-3">
                    <FileUpload id={id} purpose={f.purpose || "content"} accept={f.type === "image" ? "image/jpeg,image/png,image/webp" : PURPOSE_ACCEPT[f.purpose || ""]} label={v ? "Dəyiş" : "Yüklə"} onUploaded={(file) => set(f.name, file.url)} />
                    {v && f.type === "image" && <button type="button" onClick={() => set(f.name, "")} className="text-xs text-danger hover:underline">Çıxar</button>}
                  </div>
                </div>
              ) : (
                <Input
                  id={id}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : f.type === "time" ? "time" : f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
                  value={String(v)}
                  onChange={(e) => set(f.name, e.target.value)}
                  maxLength={f.type === "text" ? f.max : undefined}
                  min={f.type === "number" ? f.min : undefined}
                  max={f.type === "number" ? f.max : undefined}
                  aria-invalid={Boolean(errs[f.name])}
                />
              )}
            </FormField>
          );
        })}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  );
}
