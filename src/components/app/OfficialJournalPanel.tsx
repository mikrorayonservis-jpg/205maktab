import Link from "next/link";
import { BookMarked, Info, ShieldCheck } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { OfficialLink } from "@/server/official-journal";
import { Card } from "@/components/ui/Feedback";
import { OfficialJournalLink } from "./OfficialJournalLink";

const TARGET_NAME: Record<string, string> = { jurnal: "Elektron Jurnal", digital: "Rəqəmsal məktəb" };

/** Müəllim və direktor üçün "Rəsmi Elektron Jurnal" bloku (dashboard və ayrıca səhifə). Vəziyyət uydurulmur. */
export function OfficialJournalPanel({
  links,
  last,
  compact,
}: {
  links: OfficialLink[];
  last: { at: string; target: string | null } | null;
  compact?: boolean;
}) {
  return (
    <Card as="section" className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BookMarked className="size-5 text-primary" aria-hidden="true" /> Rəsmi Elektron Jurnal
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            Elm və Təhsil Nazirliyinin rəsmi sistemi yeni tabda açılır. Giriş <strong>mygov ID</strong> (SİMA İmza, Asan İmza və s.) vasitəsilə
            rəsmi portalın özündə həyata keçirilir.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {links.map((l, i) => (
            <OfficialJournalLink key={l.target} href={l.url} target={l.target} label={l.title} primary={i === 0} />
          ))}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md bg-surface-2 p-3">
          <dt className="text-xs uppercase tracking-wide text-ink-3">Bu saytda</dt>
          <dd className="mt-1">Yerli hesabla daxil olmusunuz (rəsmi dövlət hesabı deyil)</dd>
        </div>
        <div className="rounded-md bg-surface-2 p-3">
          <dt className="text-xs uppercase tracking-wide text-ink-3">Rəsmi identifikasiya</dt>
          <dd className="mt-1">Rəsmi portalda mygov ID ilə aparılır. Bu sayt rəsmi sessiyanı görmür.</dd>
        </div>
        <div className="rounded-md bg-surface-2 p-3">
          <dt className="text-xs uppercase tracking-wide text-ink-3">Rəsmi portalın son açılması (bu saytdan)</dt>
          <dd className="mt-1">{last ? `${formatDateTime(last.at)}${last.target ? ` · ${TARGET_NAME[last.target] ?? last.target}` : ""}` : "Hələ keçid edilməyib"}</dd>
        </div>
        <div className="rounded-md bg-surface-2 p-3">
          <dt className="text-xs uppercase tracking-wide text-ink-3">Rəsmi məlumatlar</dt>
          <dd className="mt-1">Bu sayta ötürülmür, sinxronizasiya aparılmır. Ünvan: {links.map((l) => l.host).join(", ")}</dd>
        </div>
      </dl>

      {compact ? (
        <p className="mt-4 text-sm">
          <Link href="/official-journal" className="text-primary hover:underline">Kömək və problemlərin həlli</Link>
        </p>
      ) : (
        <div className="mt-5 flex gap-3 rounded-md border border-line p-4 text-sm text-ink-2">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <p>
            Bu saytdakı hesabınız rəsmi dövlət hesabı deyil. Parolunuzu və ya SİMA təsdiq kodlarınızı heç vaxt bu sayta daxil etməyin —
            rəsmi giriş yalnız <span className="font-mono">mygovid.gov.az</span> və Nazirliyin portalları üzərindən aparılır.
          </p>
        </div>
      )}
      {!compact && (
        <div className="mt-3 flex gap-3 text-xs text-ink-3">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Rəsmi jurnaldakı qiymət və davamiyyət məlumatları bu sayta ötürülmür və buradan dəyişdirilə bilməz.</p>
        </div>
      )}
    </Card>
  );
}
