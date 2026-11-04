import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, LogIn, Mail, MapPin, Phone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/server/settings";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MainNav } from "./MainNav";

export const NAV = [
  { href: "/", label: "Ana səhifə" },
  { href: "/news", label: "Xəbərlər" },
  { href: "/events", label: "Tədbirlər" },
  { href: "/gallery", label: "Qalereya" },
  {
    label: "Haqqımızda",
    children: [
      { href: "/about", label: "Məktəb haqqında", desc: "Tarix, bina, infrastruktur və ənənələr" },
      { href: "/achievements", label: "Nailiyyətlər", desc: "Buraxılış nəticələri, olimpiada və müsabiqələr" },
      { href: "/teachers", label: "Müəllimlər", desc: "Pedaqoji heyət" },
      { href: "/documents", label: "Sənədlər", desc: "Nizamnamə, planlar, hesabatlar" },
    ],
  },
  { href: "/administration", label: "Rəhbərlik" },
  { href: "/contact", label: "Əlaqə" },
];

export async function SiteHeader() {
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  return (
    <header className="sticky top-0 z-40 bg-surface/95 shadow-[0_1px_0_var(--line)] backdrop-blur supports-[backdrop-filter]:bg-surface/90">
      <div className="hidden bg-surface-2 text-ink-3 md:block">
        <div className="container-page flex h-9 items-center justify-between gap-6 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" /> {s.address}
          </span>
          <span className="flex shrink-0 items-center gap-5">
            {s.phone && (
              <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                <Phone className="size-3.5 text-primary" aria-hidden="true" /> {s.phone}
              </a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                <Mail className="size-3.5 text-primary" aria-hidden="true" /> {s.email}
              </a>
            )}
          </span>
        </div>
      </div>
      <div className="container-page flex h-[4.5rem] items-center gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${s.school_short_name} — ana səhifə`}>
          <Image src="/assets/logo/logo-128.webp" alt="" width={52} height={52} className="size-12 shrink-0 object-contain md:size-[3.25rem]" priority />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">Rövşən İmanov adına</span>
            <span className="block font-display text-[14px] font-bold leading-tight text-ink sm:text-base">205 nömrəli tam orta ümumtəhsil məktəbi</span>
          </span>
        </Link>
        <MainNav items={NAV} loggedIn={Boolean(user)} />
        <div className="ml-auto hidden items-center sm:flex xl:ml-3">
          <ThemeToggle className="mr-2" />
          {user ? (
            <Link href="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-ink hover:bg-primary-hover">
              <LayoutDashboard className="size-4" aria-hidden="true" /> Kabinet
            </Link>
          ) : (
            <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-ink hover:bg-primary-hover">
              <LogIn className="size-4" aria-hidden="true" /> Giriş
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
