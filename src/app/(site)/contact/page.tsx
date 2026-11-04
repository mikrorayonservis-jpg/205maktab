import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/server/settings";
import { PageIntro } from "@/components/site/parts";

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
      <PageIntro eyebrow="Məktəb" title="Əlaqə" crumbs={[{ label: "Əlaqə" }]}>{s.school_name}</PageIntro>
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_1.4fr]">
        <ul className="space-y-4">
          {rows.map(({ Icon, label, value, href }) => (
            <li key={label} className="flex gap-4 rounded-lg border border-line bg-surface p-5">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 break-words">
                <p className="text-xs uppercase tracking-wide text-ink-3">{label}</p>
                {href ? <a href={href} className="font-medium hover:text-primary">{value}</a> : <p className="font-medium">{value}</p>}
              </div>
            </li>
          ))}
        </ul>
        <div className="overflow-hidden rounded-lg border border-line bg-surface-2">
          {map ? (
            <iframe src={map} title="Məktəbin xəritədə yeri" className="h-[420px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <div className="flex h-full min-h-60 items-center justify-center p-6 text-center text-sm text-ink-3">Xəritə administrator panelindən əlavə edildikdən sonra burada görünəcək.</div>
          )}
        </div>
      </div>
    </>
  );
}
