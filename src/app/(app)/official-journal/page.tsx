import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { getSettings } from "@/server/settings";
import { canUseOfficialJournal, lastOpened, officialLinks } from "@/server/official-journal";
import { Badge, Card, PageHeader } from "@/components/ui/Feedback";
import { CAPABILITIES, VERIFICATION_LABEL } from "@/server/integrations/official-journal-capabilities";
import { OfficialJournalPanel } from "@/components/app/OfficialJournalPanel";

export const metadata: Metadata = { title: "Rəsmi Elektron Jurnal" };

export default async function OfficialJournalPage() {
  const u = await requirePageUser("/official-journal");
  if (!canUseOfficialJournal(u)) notFound();
  const [links, last, s] = await Promise.all([officialLinks(u), lastOpened(u.id), getSettings()]);
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Rəsmi Elektron Jurnal" description="Nazirliyin rəsmi sistemlərinə təhlükəsiz keçid" />
      <OfficialJournalPanel links={links} last={last} />

      <Card as="section" className="p-5">
        <h2 className="mb-3 text-lg font-semibold">Necə işləyir</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-2">
          <li>Yuxarıdakı düymə rəsmi portalı <strong>yeni tabda</strong> açır — bu saytdakı kabinetiniz açıq qalır.</li>
          <li>Rəsmi portal sizi <strong>mygov ID</strong> səhifəsinə (<span className="font-mono">mygovid.gov.az</span>) yönləndirir.</li>
          <li>SİMA tətbiqi ilə QR kodu skan edin və ya digər rəsmi üsullardan (Asan İmza, SİMA Token) istifadə edin.</li>
          <li>Rəsmi mygov ID sessiyanız hələ aktivdirsə, portal girişi sürətləndirə bilər — bunu rəsmi sistem müəyyən edir.</li>
        </ol>
      </Card>

      <Card as="section" className="p-5">
        <h2 id="cap-h" className="mb-1 text-lg font-semibold">İnteqrasiya vəziyyəti</h2>
        <p className="mb-4 text-sm text-ink-3">Hər bənd ayrıca texniki faktdır. Rəsmi icazə olmadan heç bir mərhələ aktivləşdirilmir.</p>
        <ul className="divide-y divide-line">
          {CAPABILITIES.map((c) => (
            <li key={c.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="text-ink-3">Mərhələ {c.phase} · </span>{c.title}
                </p>
                <p className="mt-0.5 text-sm text-ink-2">{c.statusText}</p>
                {c.requirement && <p className="mt-0.5 text-xs text-ink-3">Tələb: {c.requirement}</p>}
              </div>
              <Badge tone={c.enabled ? "success" : c.verification === "UNSUPPORTED" ? "neutral" : "warning"} className="shrink-0 self-start">
                {c.enabled ? "Aktiv" : VERIFICATION_LABEL[c.verification]}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-3">Son yoxlama: {CAPABILITIES[0].checkedOn}</p>
      </Card>

      <Card as="section" className="p-5">
        <h2 className="mb-3 text-lg font-semibold">Problemlərin həlli</h2>
        <ul className="space-y-3 text-sm text-ink-2">
          <li><strong className="text-ink">Yeni tab açılmır:</strong> brauzerin bu sayt üçün açılan pəncərələri (pop-up) bloklamadığını yoxlayın və ya keçidi sağ klik → “Yeni tabda aç” ilə açın.</li>
          <li><strong className="text-ink">QR kod görünür, amma skan alınmır:</strong> SİMA tətbiqinin yeniləndiyini və telefonda internetin olduğunu yoxlayın; “Digər üsullar” bölməsindən alternativ girişi seçin.</li>
          <li><strong className="text-ink">Rəsmi jurnalda sinif və ya şagird görünmür:</strong> bu, rəsmi sistemdəki təyinatlarla bağlıdır — məktəb rəhbərliyinə və ya rəsmi dəstəyə müraciət edin.</li>
          <li><strong className="text-ink">Hansı portaldan istifadə etməliyəm?</strong> Məktəb rəhbərliyinin göstərişinə əsasən “Elektron Jurnal” (jurnal.edu.az) və ya “Rəqəmsal məktəb” (digital.edu.az).</li>
        </ul>
        <div className="mt-4 rounded-md bg-surface-2 p-4 text-sm">
          <p className="font-medium">Rəsmi texniki dəstək</p>
          <p className="mt-1 text-ink-2">
            E-poçt: <a className="text-primary hover:underline" href={`mailto:${s.official_support_email}`}>{s.official_support_email}</a> · Telefon: 146-4 ·{" "}
            <a className="text-primary hover:underline" href="https://portal.edu.az" target="_blank" rel="noopener noreferrer">portal.edu.az</a>
          </p>
          <p className="mt-2 text-xs text-ink-3">Bu saytın administratorları rəsmi hesablara giriş, parol və ya SİMA problemlərini həll edə bilmir.</p>
        </div>
      </Card>
    </div>
  );
}
