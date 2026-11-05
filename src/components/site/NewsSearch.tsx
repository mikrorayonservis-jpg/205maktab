"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * URL əsaslı axtarış sahəsi: yazdıqca ~300 ms gecikmə ilə `?q=` yenilənir (səhifə 1-ə qayıdır),
 * nəticəni server süzür. Xəbərlər və qalereya eyni komponentdən istifadə edir.
 */
export function UrlSearch({
  id,
  label,
  placeholder,
  years,
  yearParam = "year",
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  years?: number[];
  yearParam?: string;
  className?: string;
}) {
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

  function navigate(next: Record<string, string | undefined>) {
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

  const year = params.get(yearParam) ?? "";
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
      className={cn("flex w-full min-w-0 flex-col gap-2 sm:flex-row", className)}
    >
      <div className="relative flex min-w-0 flex-1 items-stretch rounded-xl border border-line-strong bg-surface shadow-[0_6px_18px_-14px_rgb(9_43_99/0.5)] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
        <label htmlFor={id} className="sr-only">{label}</label>
        {pending ? (
          <Loader2 className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 animate-spin text-ink-3" aria-hidden="true" />
        ) : (
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" aria-hidden="true" />
        )}
        <input
          id={id}
          name="q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={100}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 w-full min-w-0 flex-1 rounded-l-xl bg-transparent pl-11 pr-2 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              last.current = "";
              navigate({ q: "" });
            }}
            className="my-1 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label="Axtarışı təmizlə"
          >
            <X className="size-4" />
          </button>
        )}
        <button type="submit" className="m-1 inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy text-navy-ink hover:bg-navy-hover" aria-label="Axtar">
          <Search className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
      {years && years.length > 1 && (
        <>
          <label htmlFor={`${id}-year`} className="sr-only">İl</label>
          <select
            id={`${id}-year`}
            name={yearParam}
            value={year}
            onChange={(e) => navigate({ [yearParam]: e.target.value })}
            className="h-12 rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 sm:w-36"
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

/** Xəbərlər səhifəsinin axtarışı (geriyə uyğun ad). */
export function NewsSearch({ years }: { years: number[] }) {
  return <UrlSearch id="news-q" label="Xəbərlərdə axtarış" placeholder="Xəbərlərdə axtarış edin..." years={years} className="lg:w-[27rem] lg:shrink-0" />;
}
