"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

/** Xəbər axtarışı: yazdıqca ~300 ms gecikmə ilə URL yenilənir (səhifə 1-ə qayıdır), server nəticəni süzür. */
export function NewsSearch({ years }: { years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const last = useRef(params.get("q") ?? "");

  // Geri/irəli naviqasiyada sahəni URL ilə sinxron saxla
  useEffect(() => {
    const q = params.get("q") ?? "";
    last.current = q;
    setValue(q);
  }, [params]);

  function navigate(next: { q?: string; year?: string }) {
    const u = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) u.set(k, v);
      else u.delete(k);
    }
    u.delete("page");
    const s = u.toString();
    startTransition(() => router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false }));
  }

  useEffect(() => {
    const q = value.replace(/\s+/g, " ").trim().slice(0, 100);
    if (q === last.current) return;
    const t = setTimeout(() => {
      last.current = q;
      navigate({ q });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const year = params.get("year") ?? "";
  return (
    <form
      role="search"
      action={pathname}
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.replace(/\s+/g, " ").trim().slice(0, 100);
        last.current = q;
        navigate({ q });
      }}
      className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:w-auto"
    >
      <div className="relative min-w-0 flex-1 lg:w-80">
        <label htmlFor="news-q" className="sr-only">Xəbərlərdə axtarış</label>
        <input
          id="news-q"
          name="q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={100}
          placeholder="Xəbərlərdə axtarış edin..."
          autoComplete="off"
          className="h-10 w-full rounded-md border border-line-strong bg-surface pl-9 pr-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 [&::-webkit-search-cancel-button]:hidden"
        />
        {pending ? (
          <Loader2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-3" aria-hidden="true" />
        ) : (
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        )}
        {value && (
          <button
            type="button"
            onClick={() => { setValue(""); last.current = ""; navigate({ q: "" }); }}
            className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label="Axtarışı təmizlə"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {years.length > 1 && (
        <>
          <label htmlFor="news-year" className="sr-only">İl</label>
          <select
            id="news-year"
            name="year"
            value={year}
            onChange={(e) => navigate({ year: e.target.value })}
            className="h-10 rounded-md border border-line-strong bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 sm:w-32"
          >
            <option value="">Bütün illər</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </>
      )}
      <span className="sr-only" aria-live="polite">{pending ? "Axtarılır..." : ""}</span>
    </form>
  );
}
