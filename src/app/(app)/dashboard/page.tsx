import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, Newspaper } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { addDays, formatDate, isoWeekday, todayBaku, WEEKDAYS_AZ } from "@/lib/format";
import { activeSchoolYear, ownStudentIds, teacherAssignments } from "@/server/access";
import { listGrades, GRADE_TYPES } from "@/server/grades";
import { listHomework } from "@/server/homework";
import { lessonsFor } from "@/server/schedule";
import { schoolSummary } from "@/server/stats";
import { ensureHomeworkDueReminders } from "@/server/notifications";
import { canUseOfficialJournal, lastOpened, officialLinks } from "@/server/official-journal";
import { OfficialJournalPanel } from "@/components/app/OfficialJournalPanel";
import { Alert, Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui/Feedback";

export const metadata: Metadata = { title: "İdarə paneli" };

function gradeTone(v: number) {
  return v >= 5 ? "success" : v === 4 ? "primary" : v === 3 ? "warning" : "danger";
}

export default async function DashboardPage() {
  const u = await requirePageUser("/dashboard");
  const today = todayBaku();
  const weekday = isoWeekday(today);
  const year = await activeSchoolYear();
  const studentIds = await ownStudentIds(u);
  if (studentIds.length) await ensureHomeworkDueReminders(u.id, studentIds).catch(() => undefined);

  const children = studentIds.length
    ? await db.query<{ id: number; first_name: string; last_name: string; class_id: number | null; class_name: string | null }>(
        "SELECT s.id, s.first_name, s.last_name, s.class_id, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id IN (?) ORDER BY s.first_name",
        [studentIds]
      )
    : [];
  const familyStats = studentIds.length
    ? await db.query<{ student_id: number; avg: number | null; absences: number; late: number }>(
        `SELECT s.id AS student_id,
                (SELECT ROUND(AVG(g.grade_value), 2) FROM grades g WHERE g.student_id = s.id AND g.deleted_at IS NULL ${year ? "AND g.school_year_id = ?" : ""}) AS avg,
                (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status IN ('excused','unexcused') AND a.date >= ?) AS absences,
                (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'late' AND a.date >= ?) AS late
           FROM students s WHERE s.id IN (?)`,
        [...(year ? [year.id] : []), addDays(today, -30), addDays(today, -30), studentIds]
      )
    : [];
  const recentGrades = studentIds.length ? await listGrades(u, { limit: 8 }) : [];
  const homework = studentIds.length || u.teacherId ? ((await listHomework(u, { upcoming: true, mine: Boolean(u.teacherId) && !studentIds.length, limit: 6 })) as Array<Record<string, any>>) : [];
  const classIds = [...new Set(children.map((c) => c.class_id).filter(Boolean))] as number[];
  const todayLessons = year
    ? u.teacherId
      ? (await lessonsFor({ teacherId: u.teacherId })).filter((l) => l.day_of_week === weekday)
      : classIds.length === 1
        ? (await lessonsFor({ classId: classIds[0] })).filter((l) => l.day_of_week === weekday)
        : []
    : [];
  const assignments = u.teacherId ? await teacherAssignments(u.teacherId) : [];
  const summary = can(u, "reports.view") ? await schoolSummary() : null;
  const pendingNews = can(u, "news.review")
    ? Number((await db.queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM news WHERE status IN ('pending') AND deleted_at IS NULL"))?.n || 0)
    : 0;
  const official = canUseOfficialJournal(u) ? { links: await officialLinks(u), last: await lastOpened(u.id) } : null;

  return (
    <div className="space-y-8">
      <PageHeader title={`Xoş gəlmisiniz, ${u.firstName || u.fullName}`} description={`${WEEKDAYS_AZ[weekday - 1]}, ${formatDate(today)}${year ? ` · ${year.name} tədris ili` : ""}`} />
      {u.roles.length === 0 && (
        <Alert tone="info" title="Hesabınız rol təyinatı gözləyir">
          Qeydiyyat tamamlandı, lakin hələ heç bir rol təyin edilməyib. Məktəb administrasiyası sizi şagird, valideyn və ya müəllim kimi
          təsdiqlədikdən sonra müvafiq bölmələr açılacaq.
        </Alert>
      )}
      {!year && can(u, "school.manage") && (
        <Alert tone="warning" title="Aktiv tədris ili yoxdur">
          Jurnalın işləməsi üçün <Link href="/admin/r/school-years" className="font-medium text-primary underline">tədris ilini</Link> yaradıb aktivləşdirin.
        </Alert>
      )}

      {summary && (
        <section aria-labelledby="sum-h">
          <h2 id="sum-h" className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-ink-3">Məktəb üzrə</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Şagird" value={summary.counts.students} />
            <StatCard label="Müəllim" value={summary.counts.teachers} tone="accent" />
            <StatCard label="Orta qiymət" value={summary.grades.avg?.toFixed(2).replace(".", ",") ?? "—"} hint={`${summary.grades.count} qiymət`} tone="gold" />
            <StatCard label="Buraxılan dərs (30 gün)" value={summary.attendance30.absent} hint={summary.attendance30.total ? `${((summary.attendance30.absent / summary.attendance30.total) * 100).toFixed(1).replace(".", ",")}% qeydlərdən` : "Qeyd yoxdur"} tone="danger" />
          </div>
          <Link href="/reports" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Ətraflı hesabatlar <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </section>
      )}

      {official && <OfficialJournalPanel links={official.links} last={official.last} compact />}

      {pendingNews > 0 && (
        <Alert tone="info" title={`${pendingNews} məqalə yoxlama gözləyir`}>
          <Link href="/editorial?scope=queue" className="font-medium text-primary underline">Redaksiya növbəsinə keç</Link>
        </Alert>
      )}

      {children.length > 0 && (
        <section aria-labelledby="kids-h">
          <h2 id="kids-h" className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-ink-3">{u.parentId ? "Uşaqlarım" : "Göstəricilərim"}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {children.map((c) => {
              const st = familyStats.find((f) => f.student_id === c.id);
              return (
                <Card key={c.id} className="p-5">
                  <p className="font-semibold">{c.first_name} {c.last_name}</p>
                  <p className="text-sm text-ink-3">{c.class_name ? `${c.class_name} sinfi` : "Sinif təyin edilməyib"}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Orta qiymət</dt><dd className="text-lg font-semibold">{st?.avg != null ? Number(st.avg).toFixed(2).replace(".", ",") : "—"}</dd></div>
                    <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Buraxılış (30 gün)</dt><dd className="text-lg font-semibold">{Number(st?.absences || 0)}</dd></div>
                    <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Gecikmə</dt><dd className="text-lg font-semibold">{Number(st?.late || 0)}</dd></div>
                  </dl>
                  <div className="mt-4 flex gap-3 text-sm">
                    <Link href={`/grades?student=${c.id}`} className="text-primary hover:underline">Qiymətlər</Link>
                    <Link href={`/attendance?student=${c.id}`} className="text-primary hover:underline">Davamiyyət</Link>
                    <Link href={`/schedule?class=${c.class_id ?? ""}`} className="text-primary hover:underline">Cədvəl</Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {(u.teacherId || classIds.length === 1) && (
          <Card as="section" className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><BookOpen className="size-5 text-primary" aria-hidden="true" /> Bugünkü dərslər</h2>
            {todayLessons.length ? (
              <ol className="divide-y divide-line">
                {todayLessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-4 py-2.5 text-sm">
                    <span className="w-24 shrink-0 tabular-nums text-ink-3">{l.start_time}–{l.end_time}</span>
                    <span className="flex-1 font-medium">{l.subject_name}</span>
                    <span className="text-ink-3">{u.teacherId ? l.class_name : l.teacher_name}{l.room ? ` · ${l.room}` : ""}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-3">Bu gün cədvəldə dərs yoxdur.</p>
            )}
          </Card>
        )}

        {studentIds.length > 0 && (
          <Card as="section" className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Son qiymətlər</h2>
            {recentGrades.length ? (
              <ul className="divide-y divide-line">
                {recentGrades.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Badge tone={gradeTone(g.grade_value)} className="w-8 justify-center text-sm">{g.grade_value}</Badge>
                    <span className="flex-1"><span className="font-medium">{g.subject_name}</span>{u.parentId && <span className="text-ink-3"> · {g.student_name}</span>}<span className="block text-xs text-ink-3">{GRADE_TYPES[g.grade_type]}</span></span>
                    <span className="text-xs text-ink-3">{formatDate(g.date)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Hələ qiymət yoxdur.</p>
            )}
          </Card>
        )}

        {(studentIds.length > 0 || u.teacherId) && (
          <Card as="section" className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><ClipboardList className="size-5 text-primary" aria-hidden="true" /> Yaxınlaşan ev tapşırıqları</h2>
            {homework.length ? (
              <ul className="divide-y divide-line">
                {homework.map((h) => (
                  <li key={h.id} className="py-2.5 text-sm">
                    <Link href={`/homework/${h.id}`} className="font-medium hover:text-primary">{h.title}</Link>
                    <p className="text-xs text-ink-3">{h.subject_name} · {h.class_name} · son tarix {formatDate(h.due_date)}{u.teacherId ? ` · ${h.submission_count} cavab` : ""}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Aktiv tapşırıq yoxdur.</p>
            )}
          </Card>
        )}

        {assignments.length > 0 && (
          <Card as="section" className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Siniflərim</h2>
            <ul className="flex flex-wrap gap-2">
              {assignments.map((a) => (
                <li key={`${a.class_id}-${a.subject_id}`}>
                  <Link href={`/journal?class=${a.class_id}&subject=${a.subject_id}`} className="inline-flex items-center rounded-md border border-line px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
                    {a.class_name} · {a.subject_name}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(can(u, "news.submit") && !studentIds.length && !u.teacherId && !summary) && (
          <Card as="section" className="p-5">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><Newspaper className="size-5 text-primary" aria-hidden="true" /> Redaksiya</h2>
            <p className="text-sm text-ink-3">Məqalələrinizi idarə edin və yeni material təklif edin.</p>
            <Link href="/editorial" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">Məqalələrə keç</Link>
          </Card>
        )}
      </div>

      {!children.length && !u.teacherId && !summary && !can(u, "news.submit") && !can(u, "admin.access") && (
        <EmptyState title="Hesabınıza hələ heç bir məlumat bağlanmayıb">Şagird və ya valideyn hesabını bağlamaq üçün profil səhifəsində dəvət kodunu daxil edin.</EmptyState>
      )}
    </div>
  );
}
