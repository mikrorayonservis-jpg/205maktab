import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/server/settings";
import { usefulLinks } from "@/server/content";

const SITE_LINKS = [
  ["/about", "Məktəb haqqında"],
  ["/administration", "Rəhbərlik"],
  ["/teachers", "Müəllimlər"],
  ["/achievements", "Nailiyyətlər"],
  ["/news", "Xəbərlər"],
  ["/events", "Tədbirlər"],
  ["/gallery", "Qalereya"],
  ["/documents", "Sənədlər"],
] as const;

export async function SiteFooter() {
  const s = await getSettings();
  const links = await usefulLinks().catch((err) => {
    console.error("[footer] faydalı keçidlər yüklənmədi:", err);
    return [];
  });
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-[#172b45] text-white/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Image src="/assets/logo/logo-128.webp" alt="" width={56} height={56} className="size-14 object-contain" />
            <p className="font-display text-base font-bold leading-snug text-white">
              Rövşən İmanov adına
              <br />
              205 nömrəli tam orta ümumtəhsil məktəbi
            </p>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/70">{s.school_name}. {s.founded_year}-cu ildən fəaliyyət göstərir.</p>
          {(s.social_facebook || s.social_instagram || s.social_youtube) && (
            <ul className="flex flex-wrap gap-2 pt-1" aria-label="Sosial şəbəkələr">
              {([["Facebook", s.social_facebook], ["Instagram", s.social_instagram], ["YouTube", s.social_youtube]] as const)
                .filter(([, url]) => url)
                .map(([name, url]) => (
                  <li key={name}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/20 px-3 text-xs font-medium text-white/85 hover:border-[#d6ae64] hover:text-white">
                      {name} <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </li>
                ))}
            </ul>
          )}
        </div>
        <nav aria-label="Sayt bölmələri">
          <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#d6ae64]">Bölmələr</h2>
          <ul className="space-y-2 text-sm">
            {SITE_LINKS.map(([href, label]) => (
              <li key={href}><Link className="hover:text-white hover:underline" href={href}>{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#d6ae64]">Faydalı keçidlər</h2>
          <ul className="space-y-2 text-sm">
            {links.map((l) => (
              <li key={l.id}><a className="hover:text-white hover:underline" href={l.url} target="_blank" rel="noopener noreferrer">{l.title_az}</a></li>
            ))}
            {!links.some((l) => l.url.includes("edu.gov.az")) && (
              <li><a className="hover:text-white hover:underline" href="https://edu.gov.az" target="_blank" rel="noopener noreferrer">Elm və Təhsil Nazirliyi</a></li>
            )}
            <li><a className="hover:text-white hover:underline" href="https://bakimektebleri.edu.az/205/" target="_blank" rel="noopener noreferrer">Bakı məktəbləri portalında səhifəmiz</a></li>
            <li><Link className="hover:text-white hover:underline" href="/login">Elektron kabinet</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#d6ae64]">Əlaqə</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0 text-[#d6ae64]" aria-hidden="true" />{s.address}</li>
            {s.phone && <li className="flex gap-2.5"><Phone className="mt-0.5 size-4 shrink-0 text-[#d6ae64]" aria-hidden="true" /><a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="hover:text-white">{s.phone}</a></li>}
            {s.email && <li className="flex gap-2.5"><Mail className="mt-0.5 size-4 shrink-0 text-[#d6ae64]" aria-hidden="true" /><a href={`mailto:${s.email}`} className="break-all hover:text-white">{s.email}</a></li>}
            <li className="text-white/60">{s.working_hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {s.school_short_name}. Bütün hüquqlar qorunur.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">Məxfilik siyasəti</Link>
            <Link href="/terms" className="hover:text-white">İstifadə qaydaları</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
