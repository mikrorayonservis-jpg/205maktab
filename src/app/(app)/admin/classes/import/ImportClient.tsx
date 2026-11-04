"use client";
import { useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSubmit } from "@/lib/client/useSubmit";
import { Button } from "@/components/ui/Button";
import { FormField, Textarea } from "@/components/ui/Field";
import { Alert, Badge } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";

type Status = "create" | "move" | "unchanged" | "error";
interface Row { line: number; status: Status; studentCode: string; name: string; className: string | null; fromClass: string | null; message?: string }
interface Report { rows: Row[]; summary: Record<Status, number>; applied: boolean }

const STATUS: Record<Status, { label: string; tone: "success" | "primary" | "neutral" | "danger" }> = {
  create: { label: "Yeni şagird", tone: "success" },
  move: { label: "Sinfi dəyişir", tone: "primary" },
  unchanged: { label: "Dəyişiklik yoxdur", tone: "neutral" },
  error: { label: "Xəta", tone: "danger" },
};

const TEMPLATE = "student_id,first_name,last_name,class_code\n1001,Əli,Məmmədov,205-10B-XXXXX\n";

export function ImportClient() {
  const toast = useToast();
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const { loading, error, run, setError } = useSubmit();

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob(["﻿" + TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "sagirdler-numune.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function readFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 2_000_000) { setError("Fayl çox böyükdür (2 MB-a qədər)."); return; }
    setFileName(f.name);
    setCsv(await f.text());
    setReport(null);
  }

  async function check() {
    const r = await run(() => api<Report>("/api/admin/students/import", { body: { csv, apply: false } }));
    if (r) { setReport(r); setOnlyErrors(r.summary.error > 0); }
  }

  async function apply() {
    const r = await run(() => api<Report>("/api/admin/students/import", { body: { csv, apply: true } }));
    if (!r) return;
    setReport(r);
    if (r.applied) toast.success(`Import tamamlandı: ${r.summary.create} yeni, ${r.summary.move} köçürmə.`);
  }

  const visible = useMemo(() => (report ? (onlyErrors ? report.rows.filter((r) => r.status === "error") : report.rows) : []), [report, onlyErrors]);
  const changes = report ? report.summary.create + report.summary.move : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-base font-semibold">Fayl formatı</h2>
        <p className="mt-1 text-sm text-ink-2">
          Sütunlar: <code className="font-mono text-xs">student_id</code> (şagird kodu), <code className="font-mono text-xs">first_name</code>, <code className="font-mono text-xs">last_name</code>, <code className="font-mono text-xs">class_code</code>.
          Sinif kodu əvəzinə aktiv tədris ilindəki sinif adı da yazıla bilər (<code className="font-mono text-xs">class_name</code>, məs. 10-B).
          Excel-də “CSV UTF-8” kimi saxlayın; vergül və nöqtəli vergül ayırıcıları tanınır.
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
          <li>Şagird kodu bazada varsa, şagird təkrar yaradılmır — yalnız sinfi dəyişir.</li>
          <li>Kod yoxdursa, ad və soyadla yeni şagird profili yaradılır (hesabsız; şagird sonra sinif kodu ilə qeydiyyatdan keçəndə bu profilə bağlanır).</li>
          <li>Ən azı bir xətalı sətir varsa, heç bir dəyişiklik yazılmır.</li>
        </ul>
        <Button size="sm" variant="secondary" className="mt-3" onClick={downloadTemplate}>
          <Download className="size-4" aria-hidden="true" /> Nümunə fayl
        </Button>
      </section>

      <section className="space-y-3">
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface p-5 text-center hover:bg-surface-2">
          <Upload className="size-5 text-ink-3" aria-hidden="true" />
          <span className="text-sm font-medium text-ink">{fileName ?? "CSV faylını seçin"}</span>
          <span className="text-xs text-ink-3">.csv, 2 MB-a qədər, ən çox 5000 sətir</span>
          <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
        </label>
        <FormField id="imp-text" label="və ya mətni bura yapışdırın">
          <Textarea id="imp-text" rows={6} value={csv} onChange={(e) => { setCsv(e.target.value); setFileName(null); setReport(null); }} className="font-mono text-xs" placeholder={TEMPLATE} spellCheck={false} />
        </FormField>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={check} loading={loading && !report} disabled={!csv.trim()}>Yoxla</Button>
          {report && !report.applied && (
            <Button variant="accent" onClick={apply} loading={loading && Boolean(report)} disabled={report.summary.error > 0 || changes === 0}>
              Təsdiqlə və import et ({changes})
            </Button>
          )}
        </div>
      </section>

      {report && (
        <section className="space-y-3" aria-live="polite">
          {report.applied ? (
            <Alert tone="success" title="Import tamamlandı">{report.summary.create} yeni şagird yaradıldı, {report.summary.move} şagirdin sinfi dəyişdi, {report.summary.unchanged} sətirdə dəyişiklik olmadı.</Alert>
          ) : report.summary.error > 0 ? (
            <Alert tone="danger" title={`${report.summary.error} sətirdə xəta var`}>Xətaları faylda düzəldib yenidən yoxlayın. Heç bir dəyişiklik yazılmayıb.</Alert>
          ) : (
            <Alert tone="info" title="Yoxlama uğurludur">Aşağıdakı dəyişiklikləri yoxlayın və “Təsdiqlə və import et” düyməsini basın.</Alert>
          )}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(STATUS) as Status[]).map((k) => (
              <div key={k} className="rounded-lg border border-line bg-surface p-3">
                <dt className="text-sm text-ink-3">{STATUS[k].label}</dt>
                <dd className={`mt-0.5 text-2xl font-semibold tabular-nums ${k === "error" && report.summary.error ? "text-danger" : "text-ink"}`}>{report.summary[k]}</dd>
              </div>
            ))}
          </dl>
          {report.summary.error > 0 && (
            <label className="inline-flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
              Yalnız xətalı sətirləri göstər
            </label>
          )}
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface text-sm">
            {visible.slice(0, 1000).map((r) => (
              <li key={r.line} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2.5">
                <span className="w-14 shrink-0 tabular-nums text-ink-3">Sətir {r.line}</span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-medium text-ink">{r.name || "—"}</span>
                  <span className="block break-all text-xs text-ink-3">
                    {r.studentCode || "kodsuz"}
                    {r.className ? ` · ${r.fromClass && r.status === "move" ? `${r.fromClass} → ` : ""}${r.className}` : ""}
                  </span>
                  {r.message && <span className="mt-0.5 block text-xs font-medium text-danger">{r.message}</span>}
                </span>
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
              </li>
            ))}
          </ul>
          {visible.length > 1000 && <p className="text-sm text-ink-3">İlk 1000 sətir göstərilir ({visible.length} sətirdən).</p>}
        </section>
      )}
    </div>
  );
}
