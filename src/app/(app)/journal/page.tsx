import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import Link from "next/link";
import { canUseOfficialJournal } from "@/lib/auth/official-access";
import { Alert, PageHeader } from "@/components/ui/Feedback";
import { JournalClient } from "./JournalClient";

export const metadata: Metadata = { title: "Məktəbdaxili jurnal" };

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ class?: string; subject?: string }> }) {
  const u = await requirePageUser("/journal");
  if (!u.teacherId && !can(u, "grades.view_all") && !can(u, "grades.manage_all")) notFound();
  const sp = await searchParams;
  return (
    <div>
      <PageHeader title="Məktəbdaxili jurnal" description="Qiymətlər 2–5 şkalası üzrə yazılır. Hər dəyişiklik audit jurnalında saxlanılır." />
      <Alert tone="info" title="Bu, rəsmi dövlət jurnalı deyil" className="mb-6">
        Burada daxil edilən qiymətlər yalnız məktəbin öz saytında şagird və valideynlərə göstərilir və Nazirliyin rəsmi sisteminə ötürülmür.
        Rəsmi qiymətləndirmə Elm və Təhsil Nazirliyinin elektron jurnalında aparılmalıdır.
        {canUseOfficialJournal(u) && (
          <>
            {" "}<Link href="/official-journal" className="font-medium text-primary underline">Rəsmi Elektron Jurnala keçid</Link>
          </>
        )}
      </Alert>
      <JournalClient initialClass={Number(sp.class) || null} initialSubject={Number(sp.subject) || null} canBrowseAll={can(u, "grades.view_all") || can(u, "grades.manage_all")} />
    </div>
  );
}
