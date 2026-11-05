"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Home, LayoutGrid, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string };
export type NavGroup = { label: string; children: (NavLink & { desc?: string })[] };
export type NavItem = NavLink | NavGroup;

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

const menuId = (label: string) => `nav-${label.normalize("NFD").replace(/[^a-z0-9]/gi, "").toLowerCase()}`;

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MainNav({ items, loggedIn = false, cabinetHref }: { items: NavItem[]; loggedIn?: boolean; cabinetHref: string }) {
  const path = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Səhifə dəyişəndə açıq menyular bağlanır
  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [path]);

  // Masaüstü açılan menyu: kənara klik və Esc bağlayır, fokus düyməyə qayıdır
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const btn = navRef.current?.querySelector<HTMLButtonElement>(`[data-group="${CSS.escape(open)}"]`);
        setOpen(null);
        btn?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const closeMobile = useCallback(() => setMobile(false), []);

  // Mobil menyu: fon sürüşmür, fokus panelin içində qalır, Esc bağlayır, bağlananda fokus menyu düyməsinə qayıdır
  useEffect(() => {
    if (!mobile) return;
    const btn = menuBtn.current;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobile(false);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const els = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      btn?.focus();
    };
  }, [mobile]);

  // Ekran genişlənib masaüstü menyusu görünəndə mobil panel bağlanır
  useEffect(() => {
    if (!mobile) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setMobile(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mobile]);

  const linkCls = (active: boolean) =>
    cn(
      "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[14.5px] font-semibold transition-colors xl:px-3.5 xl:text-[15px]",
      active ? "bg-navy text-navy-ink shadow-[0_8px_18px_-12px_rgb(9_43_99/0.9)]" : "text-ink-2 hover:bg-primary-soft hover:text-ink"
    );

  return (
    <>
      <nav ref={navRef} aria-label="Əsas menyu" className="ml-auto hidden items-center gap-0.5 lg:flex xl:gap-1">
        {items.map((it) =>
          "children" in it ? (
            <div key={it.label} className="relative">
              <button
                type="button"
                data-group={it.label}
                aria-expanded={open === it.label}
                aria-controls={menuId(it.label)}
                onClick={() => setOpen(open === it.label ? null : it.label)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen(it.label);
                    requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${menuId(it.label)} a`)?.focus());
                  }
                }}
                className={linkCls(it.children.some((c) => isActive(path, c.href)))}
              >
                {it.label}
                <ChevronDown className={cn("size-3.5 transition-transform", open === it.label && "rotate-180")} aria-hidden="true" />
              </button>
              {open === it.label && (
                <div id={menuId(it.label)} className="fade-in absolute right-0 top-full z-50 mt-3 w-[30rem] rounded-2xl border border-line bg-surface p-2 shadow-lift xl:left-1/2 xl:right-auto xl:-translate-x-1/2">
                  <ul className="grid grid-cols-2 gap-1">
                    {it.children.map((c) => {
                      const on = isActive(path, c.href);
                      return (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            aria-current={on ? "page" : undefined}
                            onKeyDown={(e) => {
                              if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                              e.preventDefault();
                              const links = Array.from(e.currentTarget.closest("ul")!.querySelectorAll<HTMLElement>("a"));
                              const i = links.indexOf(e.currentTarget);
                              links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length]?.focus();
                            }}
                            className={cn("block rounded-xl p-3.5 transition-colors hover:bg-primary-soft", on && "bg-primary-soft")}
                          >
                            <span className={cn("block text-sm font-semibold", on ? "text-primary" : "text-ink")}>{c.label}</span>
                            {c.desc && <span className="mt-1 block text-xs leading-snug text-ink-3">{c.desc}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Link key={it.href} href={it.href} aria-current={isActive(path, it.href) ? "page" : undefined} className={linkCls(isActive(path, it.href))}>
              {it.href === "/" && <Home className="size-4" aria-hidden="true" />}
              {it.label}
            </Link>
          )
        )}
      </nav>

      <button
        ref={menuBtn}
        type="button"
        className="order-last inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy text-navy-ink shadow-[0_10px_22px_-14px_rgb(9_43_99/0.9)] hover:bg-navy-hover lg:hidden"
        aria-label="Menyunu aç"
        aria-expanded={mobile}
        aria-controls="mobile-menu"
        onClick={() => setMobile(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {/* Portal: başlıqdakı backdrop-filter fixed elementləri başlığın içinə həbs edir */}
      {mobile &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Sayt menyusu">
            <div className="fade-in absolute inset-0 bg-[#061e46]/55 backdrop-blur-[2px]" onClick={closeMobile} aria-hidden="true" />
            <div ref={panelRef} id="mobile-menu" className="auth-rise absolute inset-y-0 right-0 flex w-full max-w-[24rem] flex-col bg-surface shadow-2xl">
              <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
                <Link href="/" onClick={closeMobile} className="flex min-w-0 items-center gap-2.5">
                  <Image src="/assets/logo/logo-128.webp" alt="" width={40} height={40} className="size-10 object-contain" />
                  <span className="truncate font-display text-[15px] font-bold">205 nömrəli məktəb</span>
                </Link>
                <button
                  type="button"
                  data-autofocus
                  onClick={closeMobile}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink hover:bg-surface-2"
                  aria-label="Menyunu bağla"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <nav aria-label="Mobil menyu" className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
                <ul className="space-y-1">
                  {/* Telefonda tək keçidlər əvvəl, qruplar (başlıqlı) sonda: qrupun altındakı keçidlər ona aid görünməsin */}
                  {[...items.filter((i) => !("children" in i)), ...items.filter((i) => "children" in i)].map((it) =>
                    "children" in it ? (
                      <li key={it.label} className="pt-3">
                        <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">{it.label}</p>
                        <ul className="space-y-1">
                          {it.children.map((c) => (
                            <li key={c.href}>
                              <MobileLink href={c.href} active={isActive(path, c.href)} onNavigate={closeMobile}>{c.label}</MobileLink>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ) : (
                      <li key={it.href}>
                        <MobileLink href={it.href} active={isActive(path, it.href)} onNavigate={closeMobile}>{it.label}</MobileLink>
                      </li>
                    )
                  )}
                </ul>
              </nav>
              <div className="space-y-3 border-t border-line p-4">
                <div className="flex items-center justify-between rounded-xl bg-surface-2 py-1 pl-4 pr-1">
                  <span className="text-sm font-medium text-ink-2">Görünüş rejimi</span>
                  <ThemeToggle className="size-11 rounded-lg" />
                </div>
                <Link
                  href={cabinetHref}
                  onClick={closeMobile}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy text-[15px] font-semibold text-navy-ink hover:bg-navy-hover"
                >
                  <LayoutGrid className="size-4" aria-hidden="true" /> {loggedIn ? "Kabinet" : "Kabinetə giriş"}
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function MobileLink({ href, active, onNavigate, children }: { href: string; active: boolean; onNavigate: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-base font-semibold transition-colors",
        active ? "bg-primary-soft text-primary shadow-[inset_3px_0_0_var(--primary)]" : "text-ink hover:bg-surface-2"
      )}
    >
      {children}
      <ChevronRight className={cn("size-4 shrink-0", active ? "text-primary" : "text-ink-3")} aria-hidden="true" />
    </Link>
  );
}
