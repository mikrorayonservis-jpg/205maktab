"use client";
import { useRef, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

export interface Uploaded {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
}

/** Fayl yükləmə düyməsi: /api/uploads-a göndərir, server MIME və ölçünü yoxlayır. */
export function FileUpload({
  purpose,
  accept,
  onUploaded,
  label = "Fayl seç",
  id,
  className,
}: {
  purpose: string;
  accept?: string;
  onUploaded: (f: Uploaded) => void;
  label?: string;
  id?: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.set("purpose", purpose);
    fd.set("file", file);
    try {
      onUploaded(await api<Uploaded>("/api/uploads", { body: fd }));
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className={className}>
      <input ref={input} id={id} type="file" accept={accept} onChange={onChange} className="sr-only" />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md border border-dashed border-line-strong px-3 text-sm text-ink-2 hover:bg-surface-2 disabled:opacity-60">
        {busy ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
        {busy ? "Yüklənir…" : label}
      </button>
      {err && <p role="alert" className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}

export function FileChip({ name, onRemove, href }: { name: string; onRemove?: () => void; href?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs")}>
      <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
      {href ? <a href={href} target="_blank" rel="noopener" className="truncate hover:underline">{name}</a> : <span className="truncate">{name}</span>}
      {onRemove && <button type="button" onClick={onRemove} aria-label={`${name} faylını çıxar`} className="text-ink-3 hover:text-danger"><X className="size-3.5" /></button>}
    </span>
  );
}
