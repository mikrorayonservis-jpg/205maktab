import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import { eventsInRange, pastEvents, upcomingEvents } from "@/server/content";
import { EventCard, PageHero, SectionHeading } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { Pagination } from "@/components/ui/Pagination";
import { MONTHS_AZ, WEEKDAYS_SHORT_AZ, formatTime, todayBaku } from "@/lib/format";
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
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
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
  while (cells.length % 7) cells.push(null);
  const monthLabel = `${MONTHS_AZ[info.m - 1]} ${info.y}`;

  return (
    <>
      <PageHero title="Tədbirlər" subtitle="Məktəb həyatının təqvimi: qarşıdan gələn və keçirilmiş tədbirlər." crumbs={[{ label: "Tədbirlər" }]} compact imagePosition="50% 40%" />
      <div className="sheet">
        <div className="container-page grid gap-12 pb-4 pt-8 md:pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          <section aria-labelledby="up-h">
            <h2 id="up-h" className="t-section mb-6 text-[1.5rem]">Qarşıdan gələn tədbirlər</h2>
            {upcoming.length ? (
              <div className="space-y-3">{upcoming.map((e) => <EventCard key={e.id} ev={e} />)}</div>
            ) : (
              <EmptyState title="Planlaşdırılmış tədbir yoxdur" icon={<CalendarX2 />}>Yeni tədbirlər elan edildikdə burada görünəcək.</EmptyState>
            )}
          </section>

          <section aria-labelledby="cal-h" className="lg:pt-1">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                <h2 id="cal-h" className="font-display text-lg font-bold capitalize">{monthLabel}</h2>
                <div className="flex gap-1.5">
                  <Link href={`/events?ay=${info.prev}`} scroll={false} className="inline-flex size-10 items-center justify-center rounded-full border border-line hover:border-primary/40 hover:text-primary" aria-label="Əvvəlki ay"><ChevronLeft className="size-4" /></Link>
                  {ym !== today.slice(0, 7) && (
                    <Link href="/events" scroll={false} className="inline-flex h-10 items-center rounded-full border border-line px-3 text-sm font-semibold hover:border-primary/40 hover:text-primary">Bu ay</Link>
                  )}
                  <Link href={`/events?ay=${info.next}`} scroll={false} className="inline-flex size-10 items-center justify-center rounded-full border border-line hover:border-primary/40 hover:text-primary" aria-label="Növbəti ay"><ChevronRight className="size-4" /></Link>
                </div>
              </div>
              <div className="grid grid-cols-7 bg-surface-2 text-center text-[11px] font-bold uppercase tracking-wide text-ink-3" aria-hidden="true">
                {WEEKDAYS_SHORT_AZ.map((d) => <div key={d} className="py-2.5">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((d, i) => {
                  const iso = d ? `${ym}-${String(d).padStart(2, "0")}` : "";
                  const evs = d ? byDay.get(d) || [] : [];
                  return (
                    <div key={i} className={cn("min-h-12 border-r border-t border-line p-1 text-xs sm:min-h-[4.75rem] sm:p-1.5 [&:nth-child(7n)]:border-r-0", !d && "bg-surface-2/60")}>
                      {d && (
                        <>
                          <span
                            className={cn(
                              "inline-flex size-7 items-center justify-center rounded-full text-[13px] tabular-nums",
                              iso === today ? "bg-navy font-bold text-navy-ink" : evs.length ? "font-bold text-primary" : "text-ink-2"
                            )}
                          >
                            {d}
                          </span>
                          {evs.length > 0 && (
                            <>
                              <span className="mx-auto mt-0.5 block size-1.5 rounded-full bg-gold sm:hidden" aria-hidden="true" />
                              <ul className="mt-1 hidden space-y-1 sm:block">
                                {evs.map((e) => (
                                  <li key={e.id}>
                                    <Link href={`/events/${e.slug}`} className="block truncate rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-medium text-primary hover:underline" title={e.title}>{e.title}</Link>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-ink-3">{MONTHS_AZ[info.m - 1]} ayının tədbirləri</h3>
              {monthEvents.length ? (
                <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                  {monthEvents.map((e) => (
                    <li key={e.id} className="group relative flex items-center gap-3 px-4 py-3">
                      <span className="w-12 shrink-0 font-display text-lg font-extrabold tabular-nums text-band dark:text-ink">{Number(e.start_datetime.slice(8, 10))}</span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/events/${e.slug}`} className="line-clamp-2 text-[15px] font-semibold after:absolute after:inset-0 group-hover:text-primary">{e.title}</Link>
                        <p className="text-xs text-ink-3">{formatTime(e.start_datetime)}{e.location ? ` · ${e.location}` : ""}</p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 rounded-2xl border border-dashed border-line-strong px-4 py-4 text-sm text-ink-3">
                  <CalendarDays className="size-4" aria-hidden="true" /> Bu ay üçün tədbir qeyd olunmayıb.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="container-page section pb-4" aria-labelledby="past-h">
          <SectionHeading id="past-h" eyebrow="Arxiv" title="Keçirilmiş tədbirlər" />
          {past.rows.length ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{past.rows.map((e) => <EventCard key={e.id} ev={e} tone="past" />)}</div>
          ) : (
            <p className="text-sm text-ink-3">Hələ qeyd yoxdur.</p>
          )}
          <Pagination page={past.page} total={past.total} pageSize={past.pageSize} href={(p) => `/events?ay=${ym}&page=${p}`} />
        </section>
      </div>
    </>
  );
}
