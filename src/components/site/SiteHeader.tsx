import Link from "next/link";
import Image from "next/image";
import { Clock, LayoutDashboard, LogIn, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/server/settings";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MainNav } from "./MainNav";

export const NAV = [
  { href: "/", label: "Ana səhifə" },
  {
    label: "Məktəb",
    children: [
      { href: "/about", label: "Məktəb haqqında", desc: "Tarix, missiya, infrastruktur və ənənələr" },
      { href: "/administration", label: "Rəhbərlik", desc: "Direktor və direktor müavinləri" },
      { href: "/teachers", label: "Müəllimlər", desc: "Pedaqoji heyətin profilləri" },
      { href: "/documents", label: "Sənədlər", desc: "Nizamnamə, planlar, hesabatlar" },
    ],
  },
  {
    label: "Media",
    children: [
      { href: "/news", label: "Xəbərlər", desc: "Məktəb həyatından son yeniliklər" },
      { href: "/events", label: "Tədbirlər", desc: "Təqvim və qarşıdan gələn tədbirlər" },
      { href: "/gallery", label: "Qalereya", desc: "Foto və video albomlar" },
    ],
  },
  { href: "/contact", label: "Əlaqə" },
];

export async function SiteHeader() {
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="hidden border-b border-line bg-surface-2/70 text-ink-3 md:block">
        <div className="container-page flex h-8 items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden="true" /> {s.address}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" /> {s.working_hours}
          </span>
        </div>
      </div>
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${s.school_short_name} — ana səhifə`}>
          <Image src="/images/logo-64.png" alt="" width={40} height={40} className="size-10 shrink-0" priority />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[1.05rem] font-semibold text-ink">{s.school_short_name}</span>
            <span className="hidden truncate text-xs text-ink-3 sm:block">Rövşən İmanov adına tam orta məktəb</span>
          </span>
        </Link>
        <MainNav items={NAV} />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard" className="hidden h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-ink hover:bg-primary-hover sm:inline-flex">
              <LayoutDashboard className="size-4" aria-hidden="true" /> Kabinet
            </Link>
          ) : (
            <Link href="/login" className="hidden h-9 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-primary/40 hover:bg-surface-2 sm:inline-flex">
              <LogIn className="size-4" aria-hidden="true" /> Kabinet
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
