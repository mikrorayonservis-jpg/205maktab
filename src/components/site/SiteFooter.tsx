import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/server/settings";
import { usefulLinks } from "@/server/content";

export async function SiteFooter() {
  const s = await getSettings();
  const links = await usefulLinks().catch(() => []);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-line bg-surface-2/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Image src="/images/logo-64.png" alt="" width={44} height={44} className="size-11" />
            <p className="font-display text-base font-semibold leading-tight">{s.school_short_name}</p>
          </div>
          <p className="text-sm leading-relaxed text-ink-3">{s.school_name}. {s.founded_year}-cu ildən fəaliyyət göstərir.</p>
          {(s.social_facebook || s.social_instagram || s.social_youtube) && (
            <ul className="flex flex-wrap gap-2 pt-1" aria-label="Sosial şəbəkələr">
              {([["Facebook", s.social_facebook], ["Instagram", s.social_instagram], ["YouTube", s.social_youtube]] as const)
                .filter(([, url]) => url)
                .map(([name, url]) => (
                  <li key={name}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-ink-2 hover:border-primary/40 hover:text-primary">
                      {name} <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </li>
                ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold text-ink">Məktəb</h2>
          <ul className="space-y-2 text-sm text-ink-2">
            <li><Link className="hover:text-primary" href="/about">Məktəb haqqında</Link></li>
            <li><Link className="hover:text-primary" href="/administration">Rəhbərlik</Link></li>
            <li><Link className="hover:text-primary" href="/teachers">Müəllimlər</Link></li>
            <li><Link className="hover:text-primary" href="/documents">Rəsmi sənədlər</Link></li>
            <li><Link className="hover:text-primary" href="/news">Xəbərlər</Link></li>
            <li><Link className="hover:text-primary" href="/events">Tədbirlər</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold text-ink">Faydalı keçidlər</h2>
          <ul className="space-y-2 text-sm text-ink-2">
            {links.length ? (
              links.map((l) => (
                <li key={l.id}><a className="hover:text-primary" href={l.url} target="_blank" rel="noopener noreferrer">{l.title_az}</a></li>
              ))
            ) : (
              <>
                <li><a className="hover:text-primary" href="https://edu.gov.az" target="_blank" rel="noopener noreferrer">Elm və Təhsil Nazirliyi</a></li>
                <li><Link className="hover:text-primary" href="/login">Şagird və valideyn kabineti</Link></li>
              </>
            )}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold text-ink">Əlaqə</h2>
          <ul className="space-y-2.5 text-sm text-ink-2">
            <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />{s.address}</li>
            {s.phone && <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" /><a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="hover:text-primary">{s.phone}</a></li>}
            {s.email && <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" /><a href={`mailto:${s.email}`} className="hover:text-primary">{s.email}</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {s.school_short_name}. Bütün hüquqlar qorunur.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-primary">Məxfilik siyasəti</Link>
            <Link href="/terms" className="hover:text-primary">İstifadə qaydaları</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
