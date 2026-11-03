import { MONTHS_AZ } from "@/lib/format";

/** Aylıq orta qiymət xətti qrafiki (2–5 şkalası). Ekran oxuyucular üçün cədvəl də verilir. */
export function TrendChart({ points, title }: { points: { ym: string; avg: number; count: number }[]; title: string }) {
  if (points.length === 0) return <p className="text-sm text-ink-3">Qrafik üçün kifayət qədər məlumat yoxdur.</p>;
  const W = 640, H = 220, L = 36, R = 16, T = 16, B = 32;
  const min = 2, max = 5;
  const x = (i: number) => (points.length === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + ((max - v) * (H - T - B)) / (max - min);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ");
  const label = (ym: string) => MONTHS_AZ[Number(ym.slice(5, 7)) - 1]?.slice(0, 3) ?? ym;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
        {[2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v === 2 ? undefined : "3 4"} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{v}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.ym}>
            <circle cx={x(i)} cy={y(p.avg)} r="4" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2">
              <title>{`${label(p.ym)} ${p.ym.slice(0, 4)}: ${p.avg.toFixed(2)} (${p.count} qiymət)`}</title>
            </circle>
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--ink-3)">{label(p.ym)}</text>
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Ay</th><th>Orta qiymət</th><th>Qiymət sayı</th></tr></thead>
        <tbody>{points.map((p) => <tr key={p.ym}><td>{p.ym}</td><td>{p.avg}</td><td>{p.count}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Üfüqi zolaq: fənlər üzrə orta qiymət. */
export function SubjectBars({ rows }: { rows: { subject_name: string; avg: number; count: number }[] }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.subject_name} className="grid grid-cols-[minmax(7rem,12rem)_1fr_3rem] items-center gap-3 text-sm">
          <span className="truncate" title={r.subject_name}>{r.subject_name}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(0, ((r.avg - 2) / 3) * 100)}%` }} />
          </span>
          <span className="text-right font-semibold tabular-nums">{r.avg.toFixed(2).replace(".", ",")}</span>
        </li>
      ))}
    </ul>
  );
}
