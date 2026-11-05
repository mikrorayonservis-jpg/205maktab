import Link from "next/link";
import Image from "next/image";
import { Globe, LayoutGrid, Mail, MapPin, Phone, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/server/settings";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MainNav, type NavItem } from "./MainNav";

export const NAV: NavItem[] = [
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

/** Rəsmi sayt ünvanı yalnız https və müvəqqəti hostinq domeni olmadıqda göstərilir (uydurma ünvan yox). */
function officialHost(): string | null {
  try {
    const u = new URL(process.env.SITE_URL || "");
    if (u.protocol !== "https:" || /vercel\.app$|localhost/.test(u.hostname)) return null;
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function SiteHeader() {
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  const tel = s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : null;
  const host = officialHost();
  const cabinetHref = user ? "/dashboard" : "/login";

  return (
    <>
      {/* 1. Məlumat zolağı (sürüşəndə yuxarıda qalmır) */}
      <div className="bg-band-deep text-[12.5px] text-band-muted">
        <div className="container-page flex h-9 items-center justify-between gap-4 md:h-10">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-gold" aria-hidden="true" />
            <span className="truncate">{s.address}</span>
          </span>
          <span className="flex shrink-0 items-center divide-x divide-white/20">
            {tel && (
              <a href={tel} className="inline-flex items-center gap-1.5 pr-3 hover:text-band-ink md:pr-4">
                <Phone className="size-3.5 text-gold" aria-hidden="true" /> {s.phone}
              </a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} className="hidden items-center gap-1.5 px-4 hover:text-band-ink md:inline-flex">
                <Mail className="size-3.5 text-gold" aria-hidden="true" /> {s.email}
              </a>
            )}
            {host && (
              <span className="hidden items-center gap-1.5 pl-4 xl:inline-flex">
                <Globe className="size-3.5 text-gold" aria-hidden="true" /> {host}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* 2. Əsas başlıq (yapışqan) */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md supports-[backdrop-filter]:bg-surface/88">
        <div className="container-page flex h-16 items-center gap-3 lg:h-[var(--header-h)] lg:gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3" aria-label={`${s.school_name} — ana səhifə`}>
            <Image src="/assets/logo/logo-128.webp" alt="" width={56} height={56} priority className="size-11 shrink-0 object-contain sm:size-12 xl:size-14" />
            <span className="min-w-0 leading-[1.15] lg:max-xl:sr-only">
              <span className="block text-[10.5px] font-medium text-ink-3 sm:text-xs">Bakı şəhəri R.İmanov adına</span>
              <span className="block font-display text-[13px] font-bold text-ink min-[380px]:text-sm sm:text-[15px] xl:text-base">
                205 nömrəli tam orta <br className="sm:hidden" />ümumtəhsil məktəbi
              </span>
            </span>
          </Link>

          <MainNav items={NAV} loggedIn={Boolean(user)} cabinetHref={cabinetHref} />

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            <Link
              href="/news#axtaris"
              className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink-2 hover:border-primary/40 hover:text-primary lg:hidden"
              aria-label="Xəbərlərdə axtarış"
            >
              <Search className="size-[18px]" aria-hidden="true" />
            </Link>
            <ThemeToggle className="hidden size-10 rounded-full border border-line lg:inline-flex" />
            <span className="hidden h-6 w-px bg-line xl:block" aria-hidden="true" />
            <Link
              href={cabinetHref}
              className="hidden h-11 items-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-navy-ink shadow-[0_10px_22px_-14px_rgb(9_43_99/0.9)] transition-colors hover:bg-navy-hover lg:inline-flex"
            >
              <LayoutGrid className="size-4" aria-hidden="true" /> Kabinet
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
