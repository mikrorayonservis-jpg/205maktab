import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server tərəfli (link əsaslı) səhifələmə. */
export function Pagination({ page, total, pageSize, href }: { page: number; total: number; pageSize: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const nums: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) nums.push(p);
  const item = "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-line px-2 text-sm";
  return (
    <nav aria-label="Səhifələr" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link className={cn(item, "hover:bg-surface-2")} href={href(page - 1)} aria-label="Əvvəlki səhifə"><ChevronLeft className="size-4" /></Link>
      ) : (
        <span className={cn(item, "opacity-40")} aria-hidden="true"><ChevronLeft className="size-4" /></span>
      )}
      {nums.map((p) => (
        <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined} className={cn(item, p === page ? "border-primary bg-primary text-primary-ink" : "hover:bg-surface-2")}>
          {p}
        </Link>
      ))}
      {page < pages ? (
        <Link className={cn(item, "hover:bg-surface-2")} href={href(page + 1)} aria-label="Növbəti səhifə"><ChevronRight className="size-4" /></Link>
      ) : (
        <span className={cn(item, "opacity-40")} aria-hidden="true"><ChevronRight className="size-4" /></span>
      )}
    </nav>
  );
}
