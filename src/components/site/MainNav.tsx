"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string } | { label: string; children: { href: string; label: string; desc?: string }[] };

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function MainNav({ items }: { items: Item[] }) {
  const path = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [path]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
  }, [mobile]);

  return (
    <>
      <nav ref={navRef} aria-label="Əsas menyu" className="mx-auto hidden items-center gap-1 lg:flex">
        {items.map((it) =>
          "children" in it ? (
            <div key={it.label} className="relative">
              <button
                type="button"
                aria-expanded={open === it.label}
                aria-haspopup="true"
                onClick={() => setOpen(open === it.label ? null : it.label)}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-full px-4 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
                  it.children.some((c) => isActive(path, c.href)) && "bg-primary-soft text-primary"
                )}
              >
                {it.label} <ChevronDown className={cn("size-3.5 transition-transform", open === it.label && "rotate-180")} aria-hidden="true" />
              </button>
              {open === it.label && (
                <div className="absolute left-1/2 top-full mt-2 w-[26rem] -translate-x-1/2 rounded-xl border border-line bg-surface p-2 shadow-lift">
                  <ul className="grid grid-cols-2 gap-1">
                    {it.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} className="block rounded-md p-3 hover:bg-surface-2" aria-current={isActive(path, c.href) ? "page" : undefined}>
                          <span className="block text-sm font-semibold text-ink">{c.label}</span>
                          {c.desc && <span className="mt-0.5 block text-xs leading-snug text-ink-3">{c.desc}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(path, it.href) ? "page" : undefined}
              className={cn("inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", isActive(path, it.href) && "bg-primary-soft text-primary")}
            >
              {it.label}
            </Link>
          )
        )}
      </nav>

      <button
        type="button"
        className="order-last inline-flex size-9 items-center justify-center rounded-md text-ink hover:bg-surface-2 lg:hidden"
        aria-label="Menyunu aç"
        aria-expanded={mobile}
        aria-controls="mobile-menu"
        onClick={() => setMobile(true)}
      >
        <Menu className="size-5" />
      </button>

      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menyu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)} aria-hidden="true" />
          <div id="mobile-menu" className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <span className="font-display font-semibold">Menyu</span>
              <button type="button" onClick={() => setMobile(false)} className="inline-flex size-9 items-center justify-center rounded-md hover:bg-surface-2" aria-label="Menyunu bağla">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {items.map((it) =>
                "children" in it ? (
                  <div key={it.label} className="mb-2">
                    <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-3">{it.label}</p>
                    {it.children.map((c) => (
                      <Link key={c.href} href={c.href} className={cn("block rounded-md px-3 py-2.5 text-[15px] hover:bg-surface-2", isActive(path, c.href) && "bg-primary-soft text-primary")}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link key={it.href} href={it.href} className={cn("block rounded-md px-3 py-2.5 text-[15px] font-medium hover:bg-surface-2", isActive(path, it.href) && "bg-primary-soft text-primary")}>
                    {it.label}
                  </Link>
                )
              )}
            </div>
            <div className="border-t border-line p-4">
              <Link href="/dashboard" className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-ink">
                Kabinet
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
