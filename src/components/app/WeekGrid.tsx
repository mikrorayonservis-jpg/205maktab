import { WEEKDAYS_AZ } from "@/lib/format";
import type { LessonRow } from "@/server/schedule";

/** Həftəlik dərs cədvəli: masaüstündə cədvəl, mobildə günlər üzrə siyahı. */
export function WeekGrid({ lessons, mode }: { lessons: LessonRow[]; mode: "class" | "teacher" }) {
  const days = [1, 2, 3, 4, 5, ...(lessons.some((l) => l.day_of_week === 6) ? [6] : [])];
  const periods = [...new Set(lessons.map((l) => l.period))].sort((a, b) => a - b);
  if (!lessons.length) return <p className="rounded-lg border border-line bg-surface p-6 text-sm text-ink-3">Cədvəl hələ tərtib edilməyib.</p>;
  const cell = (d: number, p: number) => lessons.filter((l) => l.day_of_week === d && l.period === p);
  const secondary = (l: LessonRow) => (mode === "class" ? l.teacher_name : l.class_name);
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
        <table className="table-base table-fixed">
          <caption className="sr-only">Həftəlik dərs cədvəli</caption>
          <thead>
            <tr><th scope="col" className="w-16">Dərs</th>{days.map((d) => <th key={d} scope="col">{WEEKDAYS_AZ[d - 1]}</th>)}</tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p}>
                <th scope="row" className="text-center align-middle font-semibold">{p}</th>
                {days.map((d) => (
                  <td key={d} className="h-20">
                    {cell(d, p).map((l) => (
                      <div key={l.id} className="rounded-md border-l-[3px] border-primary bg-primary-soft/60 px-2 py-1.5">
                        <p className="text-sm font-medium leading-tight">{l.subject_name}</p>
                        <p className="text-xs text-ink-3">{secondary(l)}</p>
                        <p className="text-[11px] tabular-nums text-ink-3">{l.start_time}–{l.end_time}{l.room ? ` · ${l.room}` : ""}</p>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-4 md:hidden">
        {days.map((d) => {
          const items = lessons.filter((l) => l.day_of_week === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <section key={d} className="rounded-lg border border-line bg-surface">
              <h3 className="border-b border-line px-4 py-2 font-sans text-sm font-semibold">{WEEKDAYS_AZ[d - 1]}</h3>
              {items.length ? (
                <ol className="divide-y divide-line">
                  {items.map((l) => (
                    <li key={l.id} className="flex gap-3 px-4 py-2.5 text-sm">
                      <span className="w-6 font-semibold text-ink-3">{l.period}</span>
                      <span className="flex-1"><span className="font-medium">{l.subject_name}</span><span className="block text-xs text-ink-3">{secondary(l)}{l.room ? ` · ${l.room}` : ""}</span></span>
                      <span className="text-xs tabular-nums text-ink-3">{l.start_time}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="px-4 py-3 text-sm text-ink-3">Dərs yoxdur</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
