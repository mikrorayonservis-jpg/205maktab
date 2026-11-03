import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { eventsInRange, pastEvents, upcomingEvents } from "@/server/content";
import { EventRow, PageIntro } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { Pagination } from "@/components/ui/Pagination";
import { MONTHS_AZ, WEEKDAYS_SHORT_AZ, todayBaku } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tədbirlər", description: "Məktəb tədbirlərinin təqvimi və qarşıdan gələn tədbirlər.", alternates: { canonical: "/events" } };

function monthInfo(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { y, m, days, lead, prev, next };
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ ay?: string; page?: string }> }) {
  const sp = await searchParams;
  const today = todayBaku();
  const ym = sp.ay && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.ay) ? sp.ay : today.slice(0, 7);
  const info = monthInfo(ym);
  const page = Math.max(1, Number(sp.page) || 1);
  const [upcoming, monthEvents, past] = await Promise.all([
    upcomingEvents(8),
    eventsInRange(`${ym}-01`, `${ym}-${String(info.days).padStart(2, "0")}`),
    pastEvents(page, 9),
  ]);
  const byDay = new Map<number, typeof monthEvents>();
  for (const e of monthEvents) {
    const d = Number(e.start_datetime.slice(8, 10));
    byDay.set(d, [...(byDay.get(d) || []), e]);
  }
  const cells = [...Array(info.lead).fill(null), ...Array.from({ length: info.days }, (_, i) => i + 1)];

  return (
    <>
      <PageIntro eyebrow="Media" title="Tədbirlər" crumbs={[{ label: "Tədbirlər" }]} />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="cal-h">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="cal-h" className="text-xl font-semibold capitalize">{MONTHS_AZ[info.m - 1]} {info.y}</h2>
            <div className="flex gap-1">
              <Link href={`/events?ay=${info.prev}`} className="inline-flex size-9 items-center justify-center rounded-md border border-line hover:bg-surface-2" aria-label="Əvvəlki ay"><ChevronLeft className="size-4" /></Link>
              <Link href={`/events?ay=${info.next}`} className="inline-flex size-9 items-center justify-center rounded-md border border-line hover:bg-surface-2" aria-label="Növbəti ay"><ChevronRight className="size-4" /></Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-xs font-medium text-ink-3">
              {WEEKDAYS_SHORT_AZ.map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                const iso = d ? `${ym}-${String(d).padStart(2, "0")}` : "";
                const evs = d ? byDay.get(d) || [] : [];
                return (
                  <div key={i} className={cn("min-h-20 border-b border-r border-line p-1.5 text-xs [&:nth-child(7n)]:border-r-0", !d && "bg-surface-2/50")}>
                    {d && (
                      <>
                        <span className={cn("inline-flex size-6 items-center justify-center rounded-full", iso === today && "bg-primary font-semibold text-primary-ink")}>{d}</span>
                        <ul className="mt-1 space-y-1">
                          {evs.map((e) => (
                            <li key={e.id}>
                              <Link href={`/events/${e.slug}`} className="block truncate rounded bg-accent-soft px-1 py-0.5 text-[11px] text-accent hover:underline" title={e.title}>{e.title}</Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section aria-labelledby="up-h">
          <h2 id="up-h" className="mb-4 text-xl font-semibold">Qarşıdan gələn tədbirlər</h2>
          <div className="space-y-3">
            {upcoming.length ? upcoming.map((e) => <EventRow key={e.id} ev={e} />) : <EmptyState title="Planlaşdırılmış tədbir yoxdur" />}
          </div>
        </section>
      </div>
      <section className="container-page pb-6" aria-labelledby="past-h">
        <h2 id="past-h" className="mb-4 text-xl font-semibold">Keçirilmiş tədbirlər</h2>
        {past.rows.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{past.rows.map((e) => <EventRow key={e.id} ev={e} />)}</div>
        ) : (
          <p className="text-sm text-ink-3">Hələ qeyd yoxdur.</p>
        )}
        <Pagination page={past.page} total={past.total} pageSize={past.pageSize} href={(p) => `/events?ay=${ym}&page=${p}`} />
      </section>
    </>
  );
}
