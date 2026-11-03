"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell, BarChart3, Book, Briefcase, Calendar, CheckSquare, ClipboardList, Clock, File, GraduationCap, History, Home, Image as ImageIcon,
  KeyRound, Layers, Link2, LogOut, Menu, Newspaper, Send, Settings, Shield, Star, Tag, User, Users, X, ExternalLink,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { NavGroup } from "./nav";

const ICONS: Record<string, typeof Home> = {
  home: Home, bell: Bell, user: User, book: Book, star: Star, check: CheckSquare, calendar: Calendar, clipboard: ClipboardList,
  chart: BarChart3, news: Newspaper, shield: Shield, users: Users, key: KeyRound, graduation: GraduationCap, link: Link2,
  briefcase: Briefcase, layers: Layers, clock: Clock, tag: Tag, image: ImageIcon, file: File, settings: Settings, send: Send, history: History, external: ExternalLink,
};

function active(path: string, href: string) {
  if (href === "/admin" || href === "/dashboard") return path === href;
  return path === href || path.startsWith(href + "/");
}

export function AppShell({ nav, user, children }: { nav: NavGroup[]; user: { fullName: string; roleLabel: string; email: string }; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ unread: number }>("/api/notifications?unread=1&limit=1")
        .then((r) => alive && setUnread(r.unread))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [path]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/login");
  }

  const sidebar = (
    <nav aria-label="Kabinet menyusu" className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <Image src="/images/logo-64.png" alt="" width={32} height={32} />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-sm font-semibold">205 nömrəli məktəb</p>
          <p className="text-xs text-ink-3">Elektron jurnal</p>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {nav.map((g) => (
          <div key={g.label}>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = ICONS[it.icon] ?? File;
                const on = active(path, it.href);
                return (
                  <li key={it.href}>
                    <Link href={it.href} aria-current={on ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm", on ? "bg-primary-soft font-medium text-primary" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{it.label}</span>
                      {it.href === "/notifications" && unread > 0 && (
                        <span className="ml-auto rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white dark:text-bg">{unread > 99 ? "99+" : unread}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-3">
        <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-2"><ExternalLink className="size-4" aria-hidden="true" /> Rəsmi sayt</Link>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-danger hover:bg-danger-soft"><LogOut className="size-4" aria-hidden="true" /> Çıxış</button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menyu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] bg-surface shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-2 top-3 inline-flex size-9 items-center justify-center rounded-md hover:bg-surface-2" aria-label="Menyunu bağla"><X className="size-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur md:px-6">
          <button onClick={() => setOpen(true)} className="inline-flex size-9 items-center justify-center rounded-md hover:bg-surface-2 lg:hidden" aria-label="Menyunu aç" aria-expanded={open}><Menu className="size-5" /></button>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/notifications" className="relative inline-flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2" aria-label={`Bildirişlər${unread ? ` (${unread} oxunmamış)` : ""}`}>
              <Bell className="size-[18px]" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger" aria-hidden="true" />}
            </Link>
            <ThemeToggle />
            <Link href="/profile" className="ml-1 hidden items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-2 sm:flex">
              <span className="text-right leading-tight">
                <span className="block text-sm font-medium">{user.fullName}</span>
                <span className="block text-xs text-ink-3">{user.roleLabel}</span>
              </span>
            </Link>
          </div>
        </header>
        <main id="main" className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
