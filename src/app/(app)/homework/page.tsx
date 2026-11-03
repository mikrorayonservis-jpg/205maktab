import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { formatDate, todayBaku } from "@/lib/format";
import { listHomework } from "@/server/homework";
import { Badge, EmptyState, PageHeader } from "@/components/ui/Feedback";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Ev tapşırıqları" };

export default async function HomeworkPage() {
  const u = await requirePageUser("/homework");
  const rows = (await listHomework(u, { limit: 200 })) as Array<Record<string, any>>;
  const today = todayBaku();
  const canCreate = Boolean(u.teacherId) || can(u, "school.manage");
  return (
    <div>
      <PageHeader title="Ev tapşırıqları" actions={canCreate && <LinkButton href="/homework/new"><Plus className="size-4" aria-hidden="true" /> Yeni tapşırıq</LinkButton>} />
      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="table-base">
            <thead><tr><th scope="col">Tapşırıq</th><th scope="col">Fənn</th><th scope="col">Sinif</th><th scope="col">Son tarix</th><th scope="col">Vəziyyət</th></tr></thead>
            <tbody>
              {rows.map((h) => {
                const overdue = h.due_date < today;
                const sub = (h.submissions as { status: string; grade: number | null }[] | undefined)?.[0];
                return (
                  <tr key={h.id}>
                    <td><Link href={`/homework/${h.id}`} className="font-medium hover:text-primary">{h.title}</Link><span className="block text-xs text-ink-3">{h.teacher_name}</span></td>
                    <td>{h.subject_name}</td>
                    <td>{h.class_name}</td>
                    <td className="whitespace-nowrap tabular-nums">{formatDate(h.due_date)}</td>
                    <td>
                      {u.studentId ? (
                        sub ? <Badge tone={sub.status === "graded" ? "success" : sub.status === "returned" ? "warning" : "primary"}>{sub.status === "graded" ? `Qiymət: ${sub.grade ?? "—"}` : sub.status === "returned" ? "Düzəliş istənilib" : "Göndərilib"}</Badge>
                          : <Badge tone={overdue ? "danger" : "neutral"}>{overdue ? "Vaxtı keçib" : "Gözləyir"}</Badge>
                      ) : (
                        <span className="text-sm text-ink-3">{h.submission_count} cavab</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Ev tapşırığı yoxdur" />
      )}
    </div>
  );
}
