import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/server/settings";
import { usefulLinks } from "@/server/content";
import { BackToTop } from "./BackToTop";

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

const HEADING = "mb-5 text-xs font-bold uppercase tracking-[0.14em] text-gold";
const LINK = "inline-block py-1 text-band-muted transition-colors hover:text-band-ink [&>svg]:ml-1 [&>svg]:inline [&>svg]:align-[-2px]";

export async function SiteFooter() {
  const s = await getSettings();
  const links = await usefulLinks().catch((err) => {
    console.error("[footer] faydalı keçidlər yüklənmədi:", err);
    return [];
  });
  const year = new Date().getFullYear();
  const socials = ([["Facebook", s.social_facebook], ["Instagram", s.social_instagram], ["YouTube", s.social_youtube]] as const).filter(([, url]) => url);

  return (
    <footer className="mt-20 bg-band-deep text-[15px] text-band-muted md:mt-28">
      <div className="h-1 bg-gradient-to-r from-gold via-gold/70 to-transparent" aria-hidden="true" />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 md:py-16 lg:grid-cols-[1.5fr_1fr_1.1fr_1.3fr] lg:gap-12">
        <div className="space-y-5 sm:col-span-2 lg:col-span-1">
          <Link href="/" className="flex items-center gap-3.5">
            <Image src="/assets/logo/logo-128.webp" alt="" width={64} height={64} className="size-16 shrink-0 object-contain" />
            <span className="font-display text-base font-bold leading-snug text-band-ink">
              Bakı şəhəri R.İmanov adına
              <br />
              205 nömrəli tam orta ümumtəhsil məktəbi
            </span>
          </Link>
          <p className="max-w-sm leading-relaxed">
            {s.founded_year}-cu ildən fəaliyyət göstərən təhsil ocağı. Məktəb Azərbaycanın Milli Qəhrəmanı Rövşən İmanovun adını daşıyır.
          </p>
          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1" aria-label="Sosial şəbəkələr">
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/20 px-4 text-sm font-medium text-band-ink/90 hover:border-gold hover:text-band-ink">
                    {name} <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-labelledby="f-sections">
          <h2 id="f-sections" className={HEADING}>Bölmələr</h2>
          <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-1">
            {SITE_LINKS.map(([href, label]) => (
              <li key={href}><Link className={LINK} href={href}>{label}</Link></li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={HEADING}>Faydalı keçidlər</h2>
          <ul>
            {links.map((l) => (
              <li key={l.id}><a className={LINK} href={l.url} target="_blank" rel="noopener noreferrer">{l.title_az}<ArrowUpRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" /></a></li>
            ))}
            {!links.some((l) => l.url.includes("edu.gov.az")) && (
              <li><a className={LINK} href="https://edu.gov.az" target="_blank" rel="noopener noreferrer">Elm və Təhsil Nazirliyi<ArrowUpRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" /></a></li>
            )}
            <li><a className={LINK} href="https://bakimektebleri.edu.az/205/" target="_blank" rel="noopener noreferrer">Bakı məktəbləri portalında səhifəmiz<ArrowUpRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" /></a></li>
            <li><Link className={LINK} href="/login">Elektron kabinet</Link></li>
          </ul>
        </div>

        <div>
          <h2 className={HEADING}>Əlaqə</h2>
          <ul className="space-y-3.5">
            <li className="flex gap-3"><MapPin className="mt-1 size-4 shrink-0 text-gold" aria-hidden="true" /><span>{s.address}</span></li>
            {s.phone && (
              <li className="flex gap-3"><Phone className="mt-1 size-4 shrink-0 text-gold" aria-hidden="true" /><a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="hover:text-band-ink">{s.phone}</a></li>
            )}
            {s.email && (
              <li className="flex gap-3"><Mail className="mt-1 size-4 shrink-0 text-gold" aria-hidden="true" /><a href={`mailto:${s.email}`} className="break-all hover:text-band-ink">{s.email}</a></li>
            )}
            {s.working_hours && <li className="flex gap-3"><Clock className="mt-1 size-4 shrink-0 text-gold" aria-hidden="true" /><span>{s.working_hours}</span></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-[13px] text-band-muted/90 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {s.school_name}. Bütün hüquqlar qorunur.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-band-ink">Məxfilik siyasəti</Link>
            <Link href="/terms" className="hover:text-band-ink">İstifadə qaydaları</Link>
          </div>
        </div>
      </div>
      <BackToTop />
    </footer>
  );
}
