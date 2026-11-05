"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Ana səhifə" },
  { href: "/register", label: "Qeydiyyat" },
  { href: "/login", label: "Giriş" },
];

/**
 * Giriş, qeydiyyat və parol səhifələrinin ortaq başlığı.
 * Desktop: loqo + tam ad, sağda keçidlər (aktiv olan alt xətlə). Telefon: loqo + qısa ad, menyu düyməsi.
 */
export function AuthHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="relative z-30 border-b border-line bg-surface">
      <div className="container-page flex h-16 items-center gap-4 md:h-[4.5rem]">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="205 nömrəli məktəb — ana səhifə">
          <Image src="/assets/logo/logo-128.webp" alt="" width={48} height={48} className="size-10 shrink-0 object-contain md:size-12" priority />
          <span className="min-w-0 leading-tight">
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 md:block">Rövşən İmanov adına</span>
            <span className="block truncate font-display text-[15px] font-bold text-ink md:hidden">205 nömrəli məktəb</span>
            <span className="hidden font-display text-[15px] font-bold text-ink md:block">205 nömrəli tam orta ümumtəhsil məktəbi</span>
          </span>
        </Link>

        <nav aria-label="Giriş menyusu" className="ml-auto hidden h-full items-stretch md:flex">
          {LINKS.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center border-b-2 border-transparent px-4 text-[15px] font-medium text-ink-2 transition-colors hover:text-primary",
                  active && "border-primary text-primary"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle className="ml-auto md:ml-1" />
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md border border-line text-ink hover:bg-surface-2 md:hidden"
          aria-label={open ? "Menyunu bağla" : "Menyunu aç"}
          aria-expanded={open}
          aria-controls="auth-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <nav id="auth-menu" aria-label="Giriş menyusu" className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-lift md:hidden">
          <ul className="container-page py-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={path === l.href ? "page" : undefined}
                  className={cn("block rounded-md px-3 py-3 text-[15px] font-medium text-ink hover:bg-surface-2", path === l.href && "bg-primary-soft text-primary")}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
