import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server tərəfli (link əsaslı) səhifələmə. Uzun siyahıda ilk/son səhifə və "…" göstərilir. */
export function Pagination({ page, total, pageSize, href }: { page: number; total: number; pageSize: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const nums: (number | "gap")[] = [];
  const from = Math.max(1, page - 1);
  const to = Math.min(pages, page + 1);
  if (from > 1) nums.push(1);
  if (from > 2) nums.push("gap");
  for (let p = from; p <= to; p++) nums.push(p);
  if (to < pages - 1) nums.push("gap");
  if (to < pages) nums.push(pages);
  const item = "inline-flex size-11 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors";
  return (
    <nav aria-label="Səhifələr" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link className={cn(item, "border border-line bg-surface hover:border-primary/40 hover:text-primary")} href={href(page - 1)} aria-label="Əvvəlki səhifə"><ChevronLeft className="size-4" /></Link>
      ) : (
        <span className={cn(item, "border border-line opacity-40")} aria-hidden="true"><ChevronLeft className="size-4" /></span>
      )}
      {nums.map((p, i) =>
        p === "gap" ? (
          <span key={`g${i}`} className="px-1 text-ink-3" aria-hidden="true">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Səhifə ${p}`}
            className={cn(item, p === page ? "bg-navy text-navy-ink" : "text-ink-2 hover:bg-primary-soft hover:text-ink")}
          >
            {p}
          </Link>
        )
      )}
      {page < pages ? (
        <Link className={cn(item, "border border-line bg-surface hover:border-primary/40 hover:text-primary")} href={href(page + 1)} aria-label="Növbəti səhifə"><ChevronRight className="size-4" /></Link>
      ) : (
        <span className={cn(item, "border border-line opacity-40")} aria-hidden="true"><ChevronRight className="size-4" /></span>
      )}
    </nav>
  );
}
