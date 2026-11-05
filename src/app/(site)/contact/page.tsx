import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, MapPinned, Phone } from "lucide-react";
import { getSettings } from "@/server/settings";
import { PageHero } from "@/components/site/parts";

export const metadata: Metadata = { title: "Əlaqə", description: "Məktəbin ünvanı, telefon və e-poçt məlumatları.", alternates: { canonical: "/contact" } };

function safeMap(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (u.hostname === "www.google.com" && u.pathname.startsWith("/maps/embed")) return u.toString();
    if (u.hostname === "www.openstreetmap.org" && u.pathname.startsWith("/export/embed")) return u.toString();
  } catch {
    return null;
  }
  return null;
}

export default async function ContactPage() {
  const s = await getSettings();
  const map = s.map_embed_url ? safeMap(s.map_embed_url) : null;
  const rows = [
    { Icon: MapPin, label: "Ünvan", value: s.address },
    { Icon: Phone, label: "Telefon", value: s.phone, href: s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : undefined },
    { Icon: Mail, label: "E-poçt", value: s.email, href: s.email ? `mailto:${s.email}` : undefined },
    { Icon: Clock, label: "İş rejimi", value: s.working_hours },
  ].filter((r) => r.value);
  return (
    <>
      <PageHero title="Əlaqə" subtitle={s.school_name} crumbs={[{ label: "Əlaqə" }]} compact imagePosition="50% 75%" />
      <div className="sheet">
        <div className="container-page grid gap-8 pb-4 pt-8 md:pt-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-10">
          <div className="space-y-6">
            <ul className="card divide-y divide-line">
              {rows.map(({ Icon, label, value, href }) => (
                <li key={label} className="flex gap-4 p-5 sm:p-6">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary" aria-hidden="true"><Icon className="size-5" /></span>
                  <div className="min-w-0 break-words">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-3">{label}</p>
                    {href ? (
                      <a href={href} className="mt-1 block text-lg font-semibold text-ink hover:text-primary">{value}</a>
                    ) : (
                      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-band p-6 text-band-ink">
              <h2 className="font-display text-lg font-bold">Müəllimlə və ya sinif rəhbəri ilə əlaqə</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-band-muted">
                Müəllimlərin şəxsi əlaqə məlumatları ictimai saytda dərc olunmur. Valideyn və şagirdlər elektron kabinet vasitəsilə və ya məktəb rəhbərliyinə müraciət edə bilər.
              </p>
              <Link href="/login" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#092b63] hover:bg-[#eaf1ff]">
                Elektron kabinet <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="card min-h-[22rem] overflow-hidden lg:min-h-full">
            {map ? (
              <iframe src={map} title="Məktəbin xəritədə yeri" className="h-[22rem] w-full md:h-[28rem] lg:h-full lg:min-h-[32rem]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 bg-surface-2 p-8 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden="true"><MapPinned className="size-7" /></span>
                <p className="font-display text-lg font-semibold">{s.address}</p>
                <p className="max-w-sm text-sm text-ink-3">Xəritə administrator panelindən (Sayt parametrləri) əlavə edildikdən sonra burada görünəcək.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
